// .eslintrc.js
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
      '@typescript-eslint',
      'promise',
      'async-await'
    ],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:promise/recommended'
    ],
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      module: 'es2022',
      project: './jsconfig.json',
    },
    rules: {
      // Existing rules
      'promise/catch-or-return': 'error',
      'promise/always-return': 'error',
      'async-await/space-after-async': 'error',
      'async-await/space-after-await': 'error',
      
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // Additional optimizations
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
      'curly': ['error', 'all'],
      'prefer-const': 'error',
      'no-var': 'error'
    },
    overrides: [
      {
        files: ['*.js'],
        rules: {
          '@typescript-eslint/explicit-function-return-type': 'off'
        }
      }
    ]
  };