import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        faq: 'faq.html',
        learn: 'learn.html',
      },
    },
  },
});
