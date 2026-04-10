/** ******************************************************************
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 ****************************************************************** */

import { LitElement, html } from 'lit';
import boostContext, { BOOST_EVENT } from './context/boost-context.js';
import { customFetch, setupCtaClickHandler } from './utils/utils.js';
import { parseHtmlToSegments } from './utils/parse-plain-html.js';
import renderSegmentsToContainer from './components/BlockContainer.jsx';
import '@react-spectrum/s2/page.css';
import './styles/styles.css';

// Load fonts via Nest's approach: Typekit script + Typekit.load() (same as Nest loadTypekitAsync).
// Uses Nest's default kit (bwx4ctj) so embedded in Nest we rely on host-loaded fonts and skip.
const TYPEKIT_DEFAULT_ID = 'bwx4ctj';
const TYPEKIT_SCRIPT_TIMEOUT = 3000;
const typekitBase = 'https://use.typekit.net';
const hasTypekitScript = document.querySelector('script[src*="typekit.net/"]');
if (!hasTypekitScript) {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = typekitBase;
    preconnect.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect);

    const de = document.documentElement;
    const timeoutId = setTimeout(() => {
        de.classList.remove('wf-loading');
        de.classList.add('wf-inactive');
    }, TYPEKIT_SCRIPT_TIMEOUT);

    const script = document.createElement('script');
    de.classList.add('wf-loading');
    script.src = `${typekitBase}/${TYPEKIT_DEFAULT_ID}.js`;
    script.async = true;
    script.onload = () => {
        clearTimeout(timeoutId);
        try {
            if (window.Typekit) {
                window.Typekit.load({
                    kitId: TYPEKIT_DEFAULT_ID,
                    scriptTimeout: TYPEKIT_SCRIPT_TIMEOUT,
                    async: true,
                });
            }
        } catch (e) {
            // no NewRelic in da-xe-surfaces; avoid breaking init
        }
    };
    document.head.appendChild(script);
}

export const BOOST_TAG = 'boost-content';

const LOADER_HTML = '<div class="boost-loader" role="status" aria-label="Loading"><div class="boost-loader-spinner"></div></div>';

/** Resolve stageDomainsMap from host config (config: { stageDomainsMap }). */
function getStageDomainsMap(config) {
    if (!config?.stageDomainsMap || typeof config.stageDomainsMap !== 'object' || Array.isArray(config.stageDomainsMap)) return {};
    return config.stageDomainsMap;
}

/** Host config: set `el.config = { stageDomainsMap }` before connect (imperative embed). */
function resolveHostConfig(el) {
    return el.config && typeof el.config === 'object' ? el.config : {};
}

export default class Boost extends LitElement {
    static properties = {
        path: { type: String },
        theme: { type: String, reflect: true },
        /** Host config, e.g. `{ stageDomainsMap }`. Set on element before append. */
        config: { type: Object },
    };

    createRenderRoot() {
        return this;
    }

    constructor() {
        super();
        this.path = '';
        this.theme = '';
        this.env = '';
        this.config = {};
    }

    connectedCallback() {
        super.connectedCallback();
        const hostConfig = resolveHostConfig(this);
        const map = getStageDomainsMap(hostConfig);
        if (Object.keys(map).length) {
            boostContext.setStageDomainsMap(map);
        }
    }

    firstUpdated() {
        if (this.theme) {
            boostContext.setTheme((this.theme && this.theme.trim()) || 'light');
        }

        if (this.env) {
            boostContext.setEnv(this.env);
        }
        const hostConfig = resolveHostConfig(this);
        if (Object.keys(hostConfig).length) {
            boostContext.setStageDomainsMap(getStageDomainsMap(hostConfig));
        }
    }

    updated(changedProperties) {
        if (changedProperties.has('theme')) {
            boostContext.setTheme((this.theme && this.theme.trim()) || 'light');
        }
        if (changedProperties.has('path')) {
            this.loadFragment(this.path);
        }
        const hostConfig = resolveHostConfig(this);
        if (Object.keys(hostConfig).length) {
            boostContext.setStageDomainsMap(getStageDomainsMap(hostConfig));
        }
    }

    async loadFragment(url) {
        if (!url || !url.trim()) {
            this.clearFragmentContent();
            return;
        }

        const trimmed = url.trim();
        this.fragmentRequestId = (this.fragmentRequestId || 0) + 1;
        const loadId = this.fragmentRequestId;

        const fragmentContainer = this.querySelector('#fragment-container');
        if (fragmentContainer) {
            fragmentContainer.innerHTML = LOADER_HTML;
            fragmentContainer.dispatchEvent(new CustomEvent(BOOST_EVENT, {
                bubbles: true,
                composed: true,
                detail: { type: 'system', subType: 'loading' },
            }));
        }

        try {
            window.hlx = window.hlx || {};
            window.hlx.codeBasePath = '';

            const fragmentPath = trimmed.endsWith('.plain.html')
                ? trimmed
                : `${trimmed.replace(/\.html?$/i, '')}.plain.html`;
            const absUrl = /^https?:\/\//i.test(fragmentPath)
                ? fragmentPath
                : new URL(fragmentPath, window.location.origin).toString();
            const isCrossOrigin = new URL(absUrl).origin !== window.location.origin;
            const proxy = window.boostFragmentProxy;
            const resolveUrl = (proxy && isCrossOrigin)
                ? (targetUrl) => (typeof proxy === 'function' ? proxy(targetUrl) : proxy + encodeURIComponent(targetUrl))
                : undefined;

            const maxAttempts = 3;
            const retryStatuses = [425, 503];
            let response;
            /* eslint-disable no-await-in-loop -- intentional retry with delay */
            for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                response = await customFetch({
                    resource: fragmentPath,
                    withCacheRules: true,
                    resolveUrl,
                });
                if (loadId !== this.fragmentRequestId) return;
                const { status, statusText } = response;
                if (response.ok) break;
                if (attempt < maxAttempts - 1 && retryStatuses.includes(status)) {
                    await new Promise((r) => { setTimeout(r, 1500); });
                } else {
                    throw new Error(`HTTP ${status}: ${statusText}`);
                }
            }

            const responseHtml = await response.text();
            if (loadId !== this.fragmentRequestId) return;

            const segments = parseHtmlToSegments(responseHtml, absUrl);
            if (loadId !== this.fragmentRequestId) return;

            this.clearFragmentContent();
            const container = this.querySelector('#fragment-container');
            if (!container) return;

            const theme = (this.theme && this.theme.trim()) || 'light';
            boostContext.setTheme(theme);
            boostContext.setBaseUrl(absUrl);
            boostContext.setContainer(container);
            boostContext.setDispatchEvent((target, detail) => {
                target.dispatchEvent(new CustomEvent(BOOST_EVENT, {
                    bubbles: true,
                    composed: true,
                    detail,
                }));
            });
            setupCtaClickHandler(container);

            const reactRoot = document.createElement('div');
            reactRoot.className = 'boost-react-root';
            container.appendChild(reactRoot);
            renderSegmentsToContainer(reactRoot, segments, theme);

            const contentId = boostContext.getContentId();
            const contentName = boostContext.getContentName();
            container.dispatchEvent(new CustomEvent(BOOST_EVENT, {
                bubbles: true,
                composed: true,
                detail: {
                    type: 'system',
                    subType: 'loaded',
                    data: { contentId, contentName },
                },
            }));
        } catch (error) {
            if (loadId !== this.fragmentRequestId) return;
            this.clearFragmentContent();
            const container = this.querySelector('#fragment-container');
            if (container) {
                container.dispatchEvent(new CustomEvent(BOOST_EVENT, {
                    bubbles: true,
                    composed: true,
                    detail: { type: 'system', subType: 'error' },
                }));
            }
            // eslint-disable-next-line no-console -- fragment load failure
            console.error('boost: Error loading fragment:', error);
        }
    }

    clearFragmentContent() {
        const container = this.querySelector('#fragment-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    /* eslint-disable-next-line class-methods-use-this -- Lit render() returns template */
    render() {
        return html`
      <div id="fragment-container" class="boost-blocks" style="display: block; height: 100%; min-height: 0;"></div>
    `;
    }
}

customElements.define(BOOST_TAG, Boost);
