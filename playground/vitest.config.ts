import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Watch the whole workspace, so package sources trigger a rerun too
    root: '..',
    include: ['playground/tests/**/*.spec.ts'],
    // Hooks and tests run ace in a child process, which is slow on CI
    hookTimeout: 60_000,
    testTimeout: 60_000,
    // The spec runs the app in a child process, so vitest cannot see its module graph
    forceRerunTriggers: [
      '**/playground/{app,config,start}/**',
      '**/packages/*/{src,commands,providers}/**',
    ],
  },
})
