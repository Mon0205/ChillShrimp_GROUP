import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vuestic } from '@vuestic/compiler/vite'

export default defineConfig({
  plugins: [vuestic(), vue()],
  server: { port: 5173 },
})
