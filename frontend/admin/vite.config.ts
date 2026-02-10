import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import fs from 'fs'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  // 子域名模式：admin 始终部署在根路径 /
  base: '/',
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
    // Gzip 压缩
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // 仅压缩大于 10KB 的文件
    }),
    // Brotli 压缩（压缩率更高）
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
        api: 'modern-compiler', // 使用现代 Sass API
        silenceDeprecations: ['import'], // 暂时静默 @import 弃用警告
      },
    },
  },
  server: {
    port: 3000,
    host: true, // 监听所有接口，通过 https://admin.claymo.local:3000 访问
    https: fs.existsSync(resolve(__dirname, '../../infra/cert/claymo.local+3-key.pem'))
      ? {
          key: fs.readFileSync(resolve(__dirname, '../../infra/cert/claymo.local+3-key.pem')),
          cert: fs.readFileSync(resolve(__dirname, '../../infra/cert/claymo.local+3.pem')),
        }
      : undefined,
    proxy: {
      // 所有 API 请求代理到网关（使用 admin 子域名，让 Gateway 设置 X-Client-Type: admin）
      '/api': {
        target: 'https://admin.claymo.local:5443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // 代码分割策略
        manualChunks: {
          // Vue 核心
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          // Element Plus
          'vendor-element': ['element-plus'],
          // 工具库
          'vendor-utils': ['axios', 'lodash-es', 'dayjs'],
        },
        // 优化 chunk 文件名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // 警告阈值（超过 500KB 会警告）
    chunkSizeWarningLimit: 500,
  },
})
