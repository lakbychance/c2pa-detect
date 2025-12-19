import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'


export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        offscreen: 'index.html'
      }
    }
  },
  plugins: [react(), crx({ manifest })],
})