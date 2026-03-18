/**
 * PostCSS config: wrap all selectors with `.boost-blocks` so styles apply
 * in both boost-content (fragment) and head.html (dynamic) modes.
 */
module.exports = {
  plugins: [
    require('postcss-prefixwrap')('.boost-blocks'),
  ],
};
