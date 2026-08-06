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
    },
  },
}))
