import { useCallback, useEffect, useRef, useState } from 'react';
import type { SquareConfig } from '../../api/types';

// Minimal shape of the Square Web Payments SDK — only the pieces we touch. The
// SDK is loaded from Square's CDN at runtime; the card is tokenized in the
// browser so raw card data never reaches our backend.
interface SquareCard {
  attach(el: HTMLElement): Promise<void>;
  tokenize(): Promise<{ status: string; token?: string; errors?: { message?: string }[] }>;
  destroy(): Promise<void>;
}
interface SquarePayments {
  card(): Promise<SquareCard>;
}
interface SquareSdk {
  payments(applicationId: string, locationId: string): SquarePayments;
}
declare global {
  interface Window {
    Square?: SquareSdk;
  }
}

const SDK_URL: Record<string, string> = {
  sandbox: 'https://sandbox.web.squarecdn.com/v1/square.js',
  production: 'https://web.squarecdn.com/v1/square.js',
};

// Load (once) the SDK for a given environment. The script tag is de-duped by URL
// so remounting the pay panel doesn't inject it twice.
const loaders = new Map<string, Promise<SquareSdk>>();
function loadSquare(environment: string): Promise<SquareSdk> {
  if (window.Square) return Promise.resolve(window.Square);
  const url = SDK_URL[environment] ?? SDK_URL.production;
  let loader = loaders.get(url);
  if (!loader) {
    loader = new Promise<SquareSdk>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () =>
        window.Square
          ? resolve(window.Square)
          : reject(new Error("Couldn't start the secure payment form."));
      script.onerror = () => {
        loaders.delete(url); // let a later mount retry the load
        reject(new Error("Couldn't reach the payment provider. Check your connection and retry."));
      };
      document.head.appendChild(script);
    });
    loaders.set(url, loader);
  }
  return loader;
}

export type CardStatus = 'loading' | 'ready' | 'error';

// Owns the Square card lifecycle: load SDK -> build payments -> attach a card to
// `containerRef` -> expose `tokenize()`. Cleans the card up on unmount / config
// change. `tokenize()` returns the `cnon:…` source id or throws a human message.
export function useSquareCard(square: SquareConfig | null) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const [status, setStatus] = useState<CardStatus>('loading');
  const [loadError, setLoadError] = useState<string>();

  const appId = square?.application_id;
  const locationId = square?.location_id;
  const environment = square?.environment;

  useEffect(() => {
    if (!appId || !locationId || !environment) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let card: SquareCard | null = null;
    setStatus('loading');
    setLoadError(undefined);

    (async () => {
      try {
        const sdk = await loadSquare(environment);
        if (cancelled) return;
        card = await sdk.payments(appId, locationId).card();
        if (cancelled) {
          void card.destroy();
          return;
        }
        await card.attach(el);
        if (cancelled) {
          void card.destroy();
          return;
        }
        cardRef.current = card;
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Couldn't load the payment form.");
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      cardRef.current = null;
      void card?.destroy().catch(() => {});
    };
  }, [appId, locationId, environment]);

  const tokenize = useCallback(async (): Promise<string> => {
    const card = cardRef.current;
    if (!card) throw new Error('The payment form is still loading. Please wait a moment.');
    const result = await card.tokenize();
    if (result.status !== 'OK' || !result.token) {
      throw new Error(result.errors?.[0]?.message || 'Please check your card details and try again.');
    }
    return result.token;
  }, []);

  return { containerRef, status, loadError, tokenize };
}
