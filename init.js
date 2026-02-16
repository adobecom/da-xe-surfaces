import { LitElement, html } from 'lit';
import { loadArea, setConfig } from './utils/utils.js';

// SWC v1.11.2 — complan webpack alias overrides adobe-home-web's v0.47.2
import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/src/spectrum-two/themes.js';
import '@spectrum-web-components/button/sp-button.js';

// Static block JS imports (webpack can't dynamically resolve via file: symlink)
import hvaCardDecorate from './blocks/hva-card/hva-card.js';
import vimeoDecorate from './blocks/vimeo/vimeo.js';
import pageMetadataDecorate from './blocks/page-metadata/page-metadata.js';
import fragmentDecorate from './blocks/fragment/fragment.js';

// Static CSS imports — webpack bundles these (runtime loadCSS would 404 in nest)
import './styles/styles.css';
import './blocks/hva-card/hva-card.css';
import './blocks/vimeo/vimeo.css';
import './blocks/page-metadata/page-metadata.css';

// Skip runtime CSS loading (files aren't served by nest, webpack already bundled them)
window.app = window.app || {};
window.app.BUILD_MODE = 'builtin';

// Block registry — loadBlock checks this before attempting dynamic import
window.xeBlockRegistry = {
  'hva-card': hvaCardDecorate,
  vimeo: vimeoDecorate,
  'page-metadata': pageMetadataDecorate,
  fragment: fragmentDecorate,
};

export const XE_SITES_TAG = 'xe-sites';

const config = {
  contentRoot: '/',
  codeRoot: '/',
  miloLibs: window.location.origin,
};

export default class XeSites extends LitElement {
  static properties = {
    path: { type: String },
    loadError: { type: String },
  };

  // Render in light DOM so block CSS and SWC styles apply
  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.path = '';
    this.loadError = '';
  }

  async firstUpdated() {
    if (this.path) {
      await this.loadFragment(this.path);
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('path') && this.hasUpdated) {
      this.loadFragment(this.path);
    }
  }

  async loadFragment(url) {
    this.loadError = '';
    if (!url || !url.trim()) {
      this.clearFragmentContent();
      return;
    }

    try {
      window.hlx = window.hlx || {};
      window.hlx.codeBasePath = '';
      setConfig(config);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const responseHtml = await response.text();
      const parser = new DOMParser();
      const fragmentDoc = parser.parseFromString(responseHtml, 'text/html');

      const main = document.createElement('main');
      main.innerHTML = fragmentDoc.body.innerHTML;

      this.clearFragmentContent();

      // Wrap in sp-theme so SWC components get Spectrum tokens
      const theme = document.createElement('sp-theme');
      theme.setAttribute('scale', 'medium');
      theme.setAttribute('color', 'light');
      theme.setAttribute('system', 'spectrum-two');
      theme.appendChild(main);

      this.querySelector('#fragment-container').appendChild(theme);

      await loadArea(main);
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : String(error);
      this.clearFragmentContent();
      // eslint-disable-next-line no-console
      console.error('xe-sites: Error loading fragment:', error);
    }
  }

  clearFragmentContent() {
    const container = this.querySelector('#fragment-container');
    if (container) {
      container.innerHTML = '';
    }
  }

  render() {
    if (this.loadError) {
      return html`<p role="alert">Failed to load fragment: ${this.loadError}</p>`;
    }
    return html`<div id="fragment-container"></div>`;
  }
}

customElements.define(XE_SITES_TAG, XeSites);
