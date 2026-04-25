import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  clean: true,
  treeshake: true,
  fixedExtension: false,
  outDir: './build',
  format: ['esm'],
  dts: true,
  unbundle: true,
  platform: 'node',
  target: 'es2022',
  deps: {
    skipNodeModulesBundle: true,
  },
})
