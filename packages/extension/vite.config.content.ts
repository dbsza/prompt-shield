import { defineConfig } from 'vite';
import { resolve } from 'path';

// Separate build for content script — must be IIFE (no ES module imports)
// because Chrome content_scripts don't support ES modules.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't clear dist — main build already populated it
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      name: 'PromptShieldContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        // Ensure no external imports remain
        inlineDynamicImports: true,
      },
    },
  },
});
