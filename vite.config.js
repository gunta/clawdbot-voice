import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  // Serve from root since index.html is in root
  root: '.',
  
  // Public directory for deployment config files (_headers)
  publicDir: 'public',
  
  plugins: [
    // Copy static assets that aren't processed by Vite
    viteStaticCopy({
      targets: [
        { src: 'icons', dest: '' },
        { src: 'audio', dest: '' },
        { src: 'manifest.json', dest: '' },
        { src: 'browserconfig.xml', dest: '' },
        { src: 'favicon.png', dest: '' },
        { src: 'apple-touch-icon.png', dest: '' },
        { src: 'sw.js', dest: '' },
        { src: 'skills', dest: '' },
        // Component styles for Declarative Shadow DOM (must maintain paths)
        { src: 'src/components/styles', dest: 'src/components' },
        // Fonts
        { src: 'src/fonts', dest: 'src' },
        // Vendor files (WASM, etc)
        { src: 'src/vendor', dest: 'src' },
      ],
    }),
  ],
  
  server: {
    port: 3000,
    // Cross-Origin Isolation headers for SharedArrayBuffer (SQLite WASM)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  
  preview: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  
  build: {
    outDir: 'dist',
    // Asset handling
    assetsDir: 'assets',
    // Don't inline small assets (keep files separate for caching)
    assetsInlineLimit: 0,
    // Copy public directory contents
    copyPublicDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        components: resolve(__dirname, 'components.html'),
      },
    },
  },
  
  // Ensure .wasm files are handled correctly
  optimizeDeps: {
    exclude: ['@aspect-build/aspect-workflows'],
  },
  
  // Handle various file types as assets
  assetsInclude: ['**/*.wasm', '**/*.bin', '**/*.woff2', '**/*.mp3'],
});
