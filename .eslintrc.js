module.exports = {
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ['plugin:prettier/recommended'],
  plugins: ['disable', 'import', 'lit', 'notice', 'sort-imports-es6-autofix'],
  rules: {
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-commonjs': 'error',
    'import/no-duplicates': 'error',
    'lit/attribute-value-entities': 'error',
    'lit/binding-positions': 'error',
    'lit/no-legacy-template-syntax': 'error',
    'lit/no-template-arrow': 'error',
    'lit/no-template-bind': 'error',
    'notice/notice': [
      'error',
      {
        mustMatch: 'Copyright 20\\d{2} The AMP HTML Authors\\.',
        templateFile: 'LICENSE-TEMPLATE.txt',
        messages: {
          whenFailedToMatch: 'Missing or incorrect license header',
        },
      },
    ],
    'no-undef': 'error',
    'no-unused-vars': [
      'error',
      {
        varsIgnorePattern: '^(_$|unused)',
        argsIgnorePattern: '^(_$|unused)',
        args: 'after-used',
        ignoreRestSiblings: false,
      },
    ],
    'sort-imports-es6-autofix/sort-imports-es6': ['error', {ignoreCase: true}],
  },
};
