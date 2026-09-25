import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'test' ? '/ConstruleadsTest/' : '/ConstruleadsWeb/',
  plugins: [react()],
  server: {
    proxy: {
      '/bimsa-ws': {
        target: 'https://www.construleads.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/bimsa-ws/, '/ws_new_cl'),
      },
      // El portal de Analytics solo permite iframes del mismo origen.
      // En producción ya comparte www.construleads.com; este proxy conserva
      // esa misma condición durante el desarrollo local.
      '/ws_pbi_new': {
        target: 'https://www.construleads.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
}))
