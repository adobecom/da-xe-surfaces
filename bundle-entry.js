/**
 * Single entry for release bundle: xe-sites (init) + full-page scripts.
 * Used by both head.html (Milo/AEM) and Nest (Boost).
 *
 * In Nest, SWC is loaded by the main app before this script. Wrap customElements.define
 * so duplicate registrations (e.g. sp-theme, sp-button) are no-ops instead of throwing.
 */
import './init.js';
import './scripts/scripts.js';

const define = customElements.define.bind(customElements);
customElements.define = function (name, clazz, options) {
  if (customElements.get(name)) return;
  define(name, clazz, options);
};
