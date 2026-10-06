import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the same dist/ build works whether served from a
  // domain root (dev, Capacitor's WebView) or a subpath (itch.io's HTML5
  // hosting serves games from a non-root path, where absolute "/assets/..."
  // paths would 404).
  base: './',
  server: {
    port: 5173,
  },
});
