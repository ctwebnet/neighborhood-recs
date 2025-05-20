const js = require('@eslint/js');

module.exports = [
  {
    ignores: ['node_modules/**', 'lib/**'], // ← Add this
  },
  js.configs.recommended,
];
