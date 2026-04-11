/**
 * PostCSS config: wrap all selectors with `.boost-blocks` so styles apply
 * in both boost-content (fragment) and head.html (dynamic) modes.
 */
import prefixwrap from 'postcss-prefixwrap';

export default { plugins: [prefixwrap('.boost-blocks')] };
