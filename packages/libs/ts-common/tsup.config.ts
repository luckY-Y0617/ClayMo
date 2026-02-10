import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['http/index.ts', 'errors/index.ts', 'index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
})

