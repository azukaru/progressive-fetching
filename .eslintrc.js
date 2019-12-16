'use strict';

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'prettier',
  ],
  parserOptions: {
    sourceType: 'module',
  },
  plugins: [
    'node',
    'prettier',
  ],
  'rules': {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        trailingComma: 'es5',
      },
    ],
    'block-scoped-var': 'error',
    eqeqeq: 'error',
    'no-var': 'error',
    'prefer-const': 'error',
  },
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
      plugins: [
        '@typescript-eslint',
      ],
      rules: {
        'no-unused-vars': 'off',
        'node/no-unsupported-features/es-syntax': 'off',
        'node/no-missing-import': 'off',
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-use-before-define': 'off',
      },
    },
    {
      files: ['*.spec.*'],
      env: {
        jest: true,
      },
    },
  ],
  settings: {
    node: {
      tryExtensions: ['.js', '.json', '.node', '.ts'],
    },
  },
};
