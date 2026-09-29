import net from 'node:net'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const BACKEND_HOST = 'localhost'
const BACKEND_PORT = 8080

// Holds dev-server startup until the Go backend accepts connections, so the
// browser never hits the /api proxy while `go run .` is still compiling.
function waitForBackend({ host, port, timeoutMs = 60_000, intervalMs = 500 }) {
  const probe = () =>
    new Promise((resolve) => {
      const socket = net.connect({ host, port })
      socket.once('connect', () => { socket.destroy(); resolve(true) })
      socket.once('error', () => { socket.destroy(); resolve(false) })
    })

  return {
    name: 'wait-for-backend',
    apply: 'serve',
    async configureServer(server) {
      const log = server.config.logger
      if (await probe()) return
      log.info(`Waiting for backend on ${host}:${port}...`)
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, intervalMs))
        if (await probe()) {
          log.info('Backend is up.')
          return
        }
      }
      log.warn(`Backend not reachable on ${host}:${port} after ${timeoutMs / 1000}s; starting anyway.`)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), waitForBackend({ host: BACKEND_HOST, port: BACKEND_PORT })],
  server: {
    proxy: {
      '/api': {
        target: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
