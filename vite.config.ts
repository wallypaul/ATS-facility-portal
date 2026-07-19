import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pre-bundle every @mui/x-date-pickers entrypoint we import together, so they
  // share ONE copy of the internal LocalizationProvider context. When Vite's dep
  // optimizer splits these deep imports into separate chunks, each gets its own
  // context object and pickers throw "Can not find the ... localization context"
  // even though <LocalizationProvider> is mounted. (Single x-date-pickers@9
  // installed — this is a bundler split, not a version conflict.)
  optimizeDeps: {
    include: [
      '@mui/x-date-pickers/AdapterDayjs',
      '@mui/x-date-pickers/LocalizationProvider',
      '@mui/x-date-pickers/DatePicker',
      '@mui/x-date-pickers/TimePicker',
    ],
  },
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
