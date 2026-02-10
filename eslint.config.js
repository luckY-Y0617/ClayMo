/**
 * ClayMo Workspace 级 ESLint 配置
 *
 * 这是 monorepo 的共享 ESLint 配置基础。
 * 各子项目（frontend/web、frontend/admin）继承此配置并可扩展项目特有规则。
 */
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  // 全局忽略
  {
    name: 'workspace/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/packages/**/dist/**',
    ],
  },

  // JavaScript 推荐规则
  js.configs.recommended,

  // Vue 基础规则
  ...pluginVue.configs['flat/essential'],

  // TypeScript 配置
  ...vueTsEslintConfig(),

  // 跳过格式化（由 Prettier 处理）
  skipFormatting,

  // 共享自定义规则
  {
    name: 'workspace/custom-rules',
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: {
      // Vue 规则
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',

      // TypeScript 规则
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // 代码质量 - 生产构建时警告 console（开发时允许）
      // 注意：Vite 构建时会自动设置 NODE_ENV=production
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
]

