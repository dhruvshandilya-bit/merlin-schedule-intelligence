import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/merlin-schedule-intelligence/',
  plugins: [react()],
  server: { port: 5187, host: true },
})
