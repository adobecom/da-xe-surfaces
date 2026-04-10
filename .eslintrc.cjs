/** ******************************************************************
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 ****************************************************************** */

module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: { browser: true },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
    babelOptions: { presets: ['@babel/preset-react'] },
  },
  rules: {
    indent: ['error', 4, { SwitchCase: 1 }],
    // react-dom/client is valid (package exports); resolver does not resolve it.
    'import/no-unresolved': ['error', {
      commonjs: true,
      caseSensitive: true,
      ignore: ['^react-dom/client$'],
    }],
    'no-param-reassign': [2, { props: false }],
    'linebreak-style': ['error', 'unix'],
    'import/extensions': 'off',
    'object-curly-newline': ['error', {
      ObjectExpression: { multiline: true, minProperties: 6 },
      ObjectPattern: { multiline: true, minProperties: 6 },
      ImportDeclaration: { multiline: true, minProperties: 6 },
      ExportDeclaration: { multiline: true, minProperties: 6 },
    }],
    'no-return-assign': ['error', 'except-parens'],
  },
  overrides: [
    {
      files: ['utils/utils.js', 'scripts/scripts.js'],
      rules: {
        'max-len': ['warn', { code: 120, ignoreUrls: true, ignoreStrings: true }],
        'no-restricted-syntax': 'off',
        'no-await-in-loop': 'off',
        'no-continue': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
    {
      files: ['utils/fetch-media.js'],
      rules: {
        'no-await-in-loop': 'off',
        'import/prefer-default-export': 'off',
      },
    },
    {
      files: ['utils/parse-plain-html.js'],
      rules: {
        'max-len': ['warn', { code: 130, ignoreUrls: true, ignoreStrings: true }],
        'no-plusplus': 'off',
        'no-continue': 'off',
        'no-restricted-syntax': 'off',
        'func-names': 'off',
      },
    },
    {
      files: ['webpack.config.cjs'],
      rules: { 'import/no-extraneous-dependencies': 'off' },
    },
    {
      files: ['blocks/**/*.jsx', 'components/**/*.jsx'],
      extends: ['plugin:react/recommended'],
      rules: {
        'react/jsx-uses-react': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'import/extensions': 'off',
        'react/jsx-indent': ['error', 4],
        'react/jsx-indent-props': ['error', 4],
      },
    },
  ],
  plugins: ['react'],
  settings: { react: { version: 'detect' } },
};
