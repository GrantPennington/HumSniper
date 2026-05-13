import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const tauriHost = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: tauriHost ?? false,
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
