import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
  },
  preview: {
    port: 3003,
  },
  build: {
    // MUI core + MUI X DataGrid/Pickers are legitimately large vendor chunks used
    // across the app; raise the advisory limit rather than pretend they're small.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing vendors so no single chunk balloons and
        // browser caching survives app-code changes. Function form avoids the
        // OutputOptions overload ambiguity in the config's own type-check.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@mui/x-')) return 'mui-x';
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui-core';
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/'))
            return 'react-vendor';
          if (
            id.includes('@tanstack') ||
            id.includes('axios') ||
            id.includes('react-hook-form') ||
            id.includes('zod') ||
            id.includes('dayjs')
          )
            return 'data';
          return undefined;
        },
      },
    },
  },
});
