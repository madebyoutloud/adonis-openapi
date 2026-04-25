import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/hooks.ts',
    'commands/*',
    'providers/*',
  ],
  clean: true,
  treeshake: true,
  fixedExtension: false,
  outDir: './build',
  format: ['esm'],
  dts: true,
  unbundle: true,
  platform: 'node',
  target: 'es2022',
  tsconfig: 'tsconfig.build.json',
  deps: {
    skipNodeModulesBundle: true,
  },
})
