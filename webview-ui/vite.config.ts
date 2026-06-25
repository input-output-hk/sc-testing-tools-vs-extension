import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  root: resolve(__dirname, 'entrypoint'),
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, '../build'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        testTree: resolve(__dirname, 'entrypoint/testTree.html'),
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});
