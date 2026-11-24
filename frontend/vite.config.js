import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: env.VITE_APP_BASE_PATH || "/vault/",
    plugins: [
      tailwindcss(),
      react()
    ],
    server: {
      proxy: {
        "/api": env.VITE_API_PROXY_TARGET || "http://localhost:5000",
      },
    },
  }
})
