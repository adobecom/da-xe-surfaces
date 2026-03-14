module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: { browser: true, mocha: true },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
    babelOptions: { presets: ['@babel/preset-react'] },
  },
  rules: {
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
    'no-unused-expressions': 0,
    'chai-friendly/no-unused-expressions': 2,
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      rules: { 'no-console': 'off' },
    },
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
      files: ['util/fetchMedia.js'],
      rules: {
        'no-await-in-loop': 'off',
        'import/prefer-default-export': 'off',
      },
    },
    {
      files: ['util/parsePlainHtml.js'],
      rules: {
        'max-len': ['warn', { code: 130, ignoreUrls: true, ignoreStrings: true }],
        'no-plusplus': 'off',
        'no-continue': 'off',
        'no-restricted-syntax': 'off',
        'func-names': 'off',
      },
    },
    {
      files: ['utils/decorate.js'],
      rules: { 'max-len': ['warn', { code: 120 }] },
    },
    {
      files: ['web-test-runner.config.js'],
      rules: { 'import/no-extraneous-dependencies': 'off' },
    },
    {
      files: ['blocks/react/**/*.jsx', 'ui/**/*.jsx'],
      extends: ['plugin:react/recommended'],
      rules: {
        'react/jsx-uses-react': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'import/extensions': 'off',
      },
    },
  ],
  plugins: [
    'chai-friendly',
    'react',
  ],
  settings: { react: { version: 'detect' } },
};
