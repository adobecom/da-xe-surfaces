/**
 * PostCSS config: wrap all selectors with `.xe-sites-blocks` so styles apply
 * in both xe-sites (fragment) and head.html (dynamic) modes.
 */
module.exports = {
  plugins: [
    require('postcss-prefixwrap')('.xe-sites-blocks'),
  ],
};
