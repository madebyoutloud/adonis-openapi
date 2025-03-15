import { createConfig } from '@outloud/eslint-config-adonisjs'

export default createConfig()
  .append({
    rules: {
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  })
