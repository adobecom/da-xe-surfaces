import { LitElement, html, css } from 'lit';

function getMiloLibsUrl() {
  const { hostname, search } = window.location;
  const isAemOrLocal = hostname.includes('.aem.') || hostname.includes('local');
  if (!isAemOrLocal) {
    return 'https://main--milo--adobecom.aem.live/libs';
  }
  const branch = new URLSearchParams(search).get('milolibs') || 'main';
  if (branch === 'local') return 'http://localhost:6456/libs';
  return branch.includes('--')
    ? `https://${branch}.aem.live/libs`
    : `https://${branch}--milo--adobecom.aem.live/libs`;
}

export const XE_SITES_TAG = 'xe-sites';

export default class XeSites extends LitElement {
  static properties = {
    path: { type: String },
    loadError: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    #fragment-container {
      all: initial;
      display: block;
    }
  `;

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

      const container = this.shadowRoot.getElementById('fragment-container');
      if (container) {
        container.appendChild(main);
      }
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : String(error);
      this.clearFragmentContent();
      // eslint-disable-next-line no-console
      console.error('xe-sites: Error loading fragment:', error);
    }
  }

  clearFragmentContent() {
    const container = this.shadowRoot?.getElementById('fragment-container');
    if (container) {
      const existing = container.querySelector('main');
      if (existing) existing.remove();
    }
  }

  render() {
    if (this.loadError) {
      return html`<p role="alert">Failed to load fragment: ${this.loadError}</p>`;
    }
    const miloLibs = getMiloLibsUrl();
    return html`
      <link rel="stylesheet" href="${miloLibs}/styles/styles.css">
      <div id="fragment-container"></div>
    `;
  }
}

customElements.define(XE_SITES_TAG, XeSites);
