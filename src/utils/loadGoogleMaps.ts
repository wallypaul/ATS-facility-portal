// Injects the Google Maps JS API (+ Places) script once; resolves when ready.
// No `loading=async`: that flag makes onload fire before google.maps.places is
// actually populated (it loads the namespace in a later async step), so an
// immediate `new google.maps.places.Autocomplete(...)` right after would throw.
let promise: Promise<void> | undefined;

export function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''}&libraries=places`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Maps JS API'));
    document.head.appendChild(s);
  });
  return promise;
}
