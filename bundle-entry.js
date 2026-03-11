/**
 * Single entry for release bundle: xe-sites (init) + full-page scripts.
 * Used by both head.html (Milo/AEM) and Nest (Boost).
 *
 * define-patch must run first so SWC imports in init.js skip if already registered.
 */
import './define-patch.js';
import './init.js';
import './scripts/scripts.js';
