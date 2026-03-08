/**
 * PostCSS config for xe-sites: wrap all selectors with `xe-sites` so styles
 * are scoped to the custom element and do not leak into the host (or get
 * overridden by host styles).
 */
module.exports = {
  plugins: [
    require('postcss-prefixwrap')('xe-sites'),
  ],
};
