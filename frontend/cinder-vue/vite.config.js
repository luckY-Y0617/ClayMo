import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Auth Service (token 签发)：/api -> 19001
      '/api': {
        target: 'http://localhost:19001',
        changeOrigin: true,
        secure: false,
      },

      // File Service：/fs -> 8889
      '/fs': {
        target: 'http://localhost:8889',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[proxy]', req.url, '->', proxyReq.getHeader('host'))
          })
        } 
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

