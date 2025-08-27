import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        jitsi: resolve(__dirname, 'jitsi.html'), // Explicitly add jitsi.html as an entry point
      },
    },
  },
});
