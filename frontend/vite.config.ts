import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// El backend NestJS expone la API bajo el prefijo /api.
// En desarrollo se usa un proxy para evitar CORS mientras el backend
// no tenga habilitado el origen del frontend.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'http://localhost:3000'

  const proxy = {
    '/api': {
      target,
      changeOrigin: true,
    },
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy,
    },
    preview: {
      port: 4173,
      proxy,
    },
  }
})
