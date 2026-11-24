import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: "/vault/",
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
})
