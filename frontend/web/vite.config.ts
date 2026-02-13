import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import fs from 'fs'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import viteCompression from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
      dts: 'src/types/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/types/components.d.ts',
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
    // 强制 prosemirror 系列包使用同一实例
    // 避免 pnpm + npm 混用导致 PluginKey 冲突
    dedupe: [
      'prosemirror-state',
      'prosemirror-view',
      'prosemirror-model',
      'prosemirror-transform',
      'prosemirror-keymap',
      'prosemirror-commands',
      'prosemirror-history',
      'prosemirror-tables',
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // 使用现代 Sass API
        silenceDeprecations: ['import'], // 暂时静默 @import 弃用警告
      },
    },
  },
  server: {
    port: 3001,
    host: true, // 监听所有接口，通过 https://claymo.local:3001 访问
    // 开发环境启用 HTTPS（可选，根据证书是否存在）
    https: fs.existsSync(resolve(__dirname, '../../infra/cert/claymo.local+3-key.pem'))
      ? {
          key: fs.readFileSync(resolve(__dirname, '../../infra/cert/claymo.local+3-key.pem')),
          cert: fs.readFileSync(resolve(__dirname, '../../infra/cert/claymo.local+3.pem')),
        }
      : undefined,
    open: true,
    proxy: {
      // 所有 API 请求统一代理到网关
      '/api': {
        target: 'https://localhost:5443',  // 使用 localhost
        changeOrigin: true,
        secure: false, // 允许自签名证书
      },
      // 文件服务也走网关
      '/fs': {
        target: 'https://localhost:5443',  // 使用 localhost
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    include: [
      '@tiptap/core',
      '@tiptap/vue-3',
      '@tiptap/starter-kit',
      '@tiptap/pm/state',
      '@tiptap/pm/view',
      '@tiptap/pm/model',
      '@tiptap/pm/transform',
    ],
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
          // Element Plus（按需引入后仍会有公共模块）
          'vendor-element': ['element-plus'],
          // 编辑器相关（不包含 @tiptap/pm，它是子模块导出）
          'vendor-editor': [
            '@tiptap/core',
            '@tiptap/vue-3',
            '@tiptap/starter-kit',
          ],
          // 工具库
          'vendor-utils': ['axios', 'lodash-es', 'date-fns'],
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

