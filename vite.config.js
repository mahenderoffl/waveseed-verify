import { defineConfig } from 'vite';

export default defineConfig({
  // Ensure clean base for verify.waveseed.app deployment
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
