const LOCAL_BLOCKS = [
  'adobe-tv',
  'row-card',
  'text',
  'page-metadata',
];

const AUTO_BLOCKS = [

];

const DO_NOT_INLINE = [
  'accordion',
  'columns',
  'z-pattern',
];

const PAGE_URL = new URL(window.location.href);
const LANGSTORE = 'langstore';
const PREVIEW = 'target-preview';

const SLD = PAGE_URL.hostname.includes('.aem.') ? 'aem' : 'hlx';

const ENVS = {
  stage: {
    name: 'stage',
    ims: 'stg1',
  },
  prod: {
    name: 'prod',
    ims: 'prod',
  },
};
ENVS.local = {
  ...ENVS.stage,
  name: 'local',
};

/**
 * Return the federated URL for a given href (e.g. /federal/...).
 * Fragment block uses this for federal fragment links. Passthrough by default.
 * @param {string} href - Link href
 * @returns {string} URL to fetch (same as href unless overridden)
 */
export function getFederatedUrl(href) {
  return typeof href === 'string' ? href : '';
}

function getLocale(locales, pathname = window.location.pathname) {
  if (!locales) {
    return { ietf: 'en-US', tk: 'hah7vzn.css', prefix: '' };
  }
  const split = pathname.split('/');
  const localeString = split[1];
  let locale = locales[localeString] || locales[''];
  if ([LANGSTORE, PREVIEW].includes(localeString)) {
    const ietf = Object.keys(locales).find((loc) => locales[loc]?.ietf?.startsWith(split[2]));
    if (ietf) locale = locales[ietf];
    locale.prefix = `/${localeString}/${split[2]}`;
    return locale;
  }
  const isUS = locale.ietf === 'en-US';
  locale.prefix = isUS ? '' : `/${localeString}`;
  locale.region = isUS ? 'us' : localeString.split('_')[0];
  return locale;
}

function getEnv(conf) {
  const { host } = window.location;
  const query = PAGE_URL.searchParams.get('env');

  if (query) return { ...ENVS[query], consumer: conf[query] };

  const { clientEnv } = conf;
  if (clientEnv) return { ...ENVS[clientEnv], consumer: conf[clientEnv] };

  if (host.includes('localhost')) return { ...ENVS.local, consumer: conf.local };
  return { ...ENVS.prod, consumer: conf.prod };
  /* c8 ignore stop */
}

export function getMetadata(name, doc = document) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = doc.head.querySelector(`meta[${attr}="${name}"]`);
  return meta && meta.content;
}

function setupMiloObj(config) {
  window.milo ||= {};
  window.milo.deferredPromise = new Promise((resolve) => {
    config.resolveDeferred = resolve;
  });
}

const handleEntitlements = (() => {
  const { martech } = Object.fromEntries(PAGE_URL.searchParams);
  if (martech === 'off') return () => { };
  let entResolve;
  const entPromise = new Promise((resolve) => {
    entResolve = resolve;
  });

  return (resolveVal) => {
    if (resolveVal !== undefined) {
      entResolve(resolveVal);
    }
    return entPromise;
  };
})();

export const [setConfig, getConfig] = (() => {
  let config = {};
  return [
    (conf) => {
      window.hlx = window.hlx || {};
      window.hlx.config = conf;

      const origin = conf.origin || window.location.origin;
      const pathname = conf.pathname || window.location.pathname;
      config = { env: getEnv(conf), ...conf };
      config.codeRoot = conf.codeRoot ? `${origin}${conf.codeRoot}` : origin;
      config.base = config.libs || config.codeRoot;
      config.locale = pathname ? getLocale(conf.locales, pathname) : getLocale(conf.locales);
      config.autoBlocks = conf.autoBlocks ? [...AUTO_BLOCKS, ...conf.autoBlocks] : AUTO_BLOCKS;
      config.signInContext = conf.signInContext || {};
      config.doNotInline = conf.doNotInline
        ? [...DO_NOT_INLINE, ...conf.doNotInline]
        : DO_NOT_INLINE;
      const lang = getMetadata('content-language') || config.locale.ietf;
      document.documentElement.setAttribute('lang', lang);
      try {
        const dir = getMetadata('content-direction')
          || config.locale.dir
          || (config.locale.ietf && (new Intl.Locale(config.locale.ietf)?.textInfo?.direction))
          || 'ltr';
        document.documentElement.setAttribute('dir', dir);
      } catch (e) {
        // console.log('Invalid or missing locale:', e);
      }
      config.locale.contentRoot = `${origin}${config.locale.prefix}${config.contentRoot ?? ''}`;
      config.useDotHtml = !PAGE_URL.origin.includes(`.${SLD}.`)
        && (conf.useDotHtml ?? PAGE_URL.pathname.endsWith('.html'));
      config.entitlements = handleEntitlements;
      config.consumerEntitlements = conf.entitlements || [];
      setupMiloObj(config);
      return config;
    },
    () => config,
  ];
})();

export async function decorateLinks(el) {
  const anchors = el.getElementsByTagName('a');

  const links = [...anchors].reduce((rdx, a) => {
    const textContent = a.textContent || '';
    if (textContent.includes('|')) {
      const parts = textContent.split('|').map((p) => p.trim());
      if (parts.length > 1) {
        a.setAttribute('aria-label', parts[1]);

        // Remove the attribute parts from all text nodes
        const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          if (node.textContent.includes('|')) {
            const pipeIndex = node.textContent.indexOf('|');
            node.textContent = node.textContent.substring(0, pipeIndex).trim();
            break;
          }
          node = walker.nextNode();
        }
      }
    }

    return rdx;
  }, []);
  return links;
}

/**
 * Normalize anchor href for resolution: if same-origin or hostname matches main-da-xe-surfaces
 * and path is encoded (e.g. shorthand | content-id), strip origin and return decoded path.
 * @param {string} href - Raw href from anchor
 * @returns {string} Normalized href (decoded path only when applicable)
 */
function normalizeHrefForResolve(href) {
  if (!href || typeof href !== 'string') return '';
  const h = href.trim();
  try {
    const url = new URL(h, window.location.href);
    const isSameOrigin = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
      || url.origin === window.location.origin;
    const isMainDaXeSurfaces = url.hostname.includes('main--da-xe-surfaces');
    const pathPart = (url.pathname || '').replace(/^\/+/, '') + url.search + url.hash;
    const hasEncoded = /%[0-9A-Fa-f]{2}/.test(pathPart);
    if ((isSameOrigin || isMainDaXeSurfaces) && pathPart && hasEncoded) {
      return decodeURIComponent(pathPart);
    }
  } catch (_) {
    // not a valid URL, return as-is
  }
  return h;
}

/**
 * Resolve link hrefs that use "url | data-content-id".
 * @param {Document|Element} area - Root to search for anchors (default document)
 */
export function resolveLinkHrefs(area = document) {
  const root = area === document ? document.body : area;
  const anchors = root.querySelectorAll ? root.querySelectorAll('a[href]') : [];
  anchors.forEach((a) => {
    let href = a.getAttribute('href');
    if (!href) return;
    href = normalizeHrefForResolve(href);
    try {
      href = decodeURIComponent(href);
    } catch (e) {
      // leave href as-is if decoding fails (e.g. malformed %)
    }
    // Support " | " and encoded "%20%7C%20" / " %7C " so pipe-in-href works when encoded
    let pipeSplit = null;
    if (href.includes(' | ')) pipeSplit = ' | ';
    else if (href.includes('%20%7C%20')) pipeSplit = '%20%7C%20';
    else if (href.includes(' %7C ')) pipeSplit = ' %7C ';
    let url = null;
    if (pipeSplit) {
      const [urlPart, contentIdPart] = href.split(pipeSplit).map((p) => p.trim());
      url = urlPart;
      if (contentIdPart) a.setAttribute('data-content-id', contentIdPart);
    }
    if (url) {
      a.href = url;
    }
  });
}

/**
 * Single custom event for all xe-sites events. Host uses one listener; detail shape: { type, subType, data? }.
 * - type 'system', subType 'loaded' | 'loading' | 'error'; 'error' has data: { message }
 * - type 'navigation', subType 'url', data: { href, openInNewTab }
 * - type 'analytics', subType 'track', data: { contentName?, contentId?, eventType?, subcategory?, subtype?, href? }
 */
export const XE_SITES_EVENT = 'xe-sites-event';

/**
 * Get the link or button element that was clicked (a[href] or sp-button with href).
 * @param {Event} e - Click event
 * @returns {{ el: Element, href: string }|null}
 */
function getClickedLinkOrButton(e) {
  const { target } = e;
  const link = target?.closest?.('a[href]');
  if (link) return { el: link, href: link.href || link.getAttribute('href') || '' };
  const btn = target?.closest?.('sp-button[href]') || target?.closest?.('sp-button');
  if (btn) {
    const href = btn.getAttribute?.('href') || btn.href || '';
    if (href) return { el: btn, href };
  }
  return null;
}

/**
 * Attach delegated click handler. Dispatches up to two events per click:
 * - If element has data-content-id: analytics event (type 'analytics', subType 'track') first
 * - Then navigation event (type 'navigation', subType 'url')
 * @param {Element} container - Fragment container (e.g. #fragment-container) so clicks bubble here
 */
export function setupLinkClickHandler(container) {
  if (!container?.addEventListener) return;
  container.addEventListener('click', (e) => {
    const result = getClickedLinkOrButton(e);
    if (!result) return;
    const { el, href } = result;
    if (!href || href === '#') return;
    e.preventDefault();
    e.stopPropagation();
    const openInNewTab = href.includes('#_blank');
    const hasAnalytics = el.getAttribute?.('data-content-id');
    if (hasAnalytics) {
      const analyticsDetail = {
        type: 'analytics',
        subType: 'track',
        data: {
          eventType: 'click',
          subtype: hasAnalytics,
          contentAction: href,
        },
      };
      container.dispatchEvent(new CustomEvent(XE_SITES_EVENT, {
        bubbles: true,
        composed: true,
        detail: analyticsDetail,
      }));
    }
    const navigationDetail = {
      type: 'navigation',
      subType: 'url',
      data: { href, openInNewTab },
    };
    container.dispatchEvent(new CustomEvent(XE_SITES_EVENT, {
      bubbles: true,
      composed: true,
      detail: navigationDetail,
    }));
  }, true);
}

export function filterDuplicatedLinkBlocks(blocks) {
  if (!blocks?.length) return [];
  const uniqueModalKeys = new Set();
  const uniqueBlocks = [];
  for (const obj of blocks) {
    if (obj.className.includes('modal')) {
      const key = `${obj.dataset.modalHash}-${obj.dataset.modalPath}`;
      if (!uniqueModalKeys.has(key)) {
        uniqueModalKeys.add(key);
        uniqueBlocks.push(obj);
      }
    } else {
      uniqueBlocks.push(obj);
    }
  }
  return uniqueBlocks;
}

/**
 * Get all options from block classes with a given prefix, e.g. getBlockOptions(block, 'cta')
 * finds ctavariant-accent, ctasize-m and returns { variant: 'accent', size: 'm' }.
 * Matches case-insensitively.
 * @param {Element} block - Block element
 * @param {string} prefix - Class prefix (e.g. 'cta')
 * @returns {Record<string, string>} Object of key/value from prefixkey-value classes
 */
export function getBlockOptions(block, prefix) {
  const pre = prefix.toLowerCase();
  const result = {};
  (block.classList || []).forEach((c) => {
    if (c.length <= pre.length || !c.toLowerCase().startsWith(pre)) return;
    const rest = c.slice(pre.length); // e.g. "variant-accent", "size-m"
    const dash = rest.indexOf('-');
    if (dash < 0) return;
    const key = rest.slice(0, dash);
    const value = rest.slice(dash + 1);
    if (key && value) result[key] = value;
  });
  return result;
}

async function decorateSection(section, idx) {
  let links = await decorateLinks(section);
  const blocks = section.querySelectorAll(':scope > div[class]:not(.content)');
  blocks.forEach((el) => { if (!el.classList.contains('block')) el.classList.add('block'); });

  const { doNotInline } = getConfig();
  const blockLinks = [...blocks].reduce((blkLinks, block) => {
    const blockName = block.classList[0];
    links.filter((link) => block.contains(link))
      .forEach((link) => {
        if (link.classList.contains('fragment')
          && LOCAL_BLOCKS.includes(blockName) // do not inline consumer blocks (for now)
          && !doNotInline.includes(blockName)) {
          if (!link.href.includes('#_inline')) {
            link.href = `${link.href}#_inline`;
          }
          blkLinks.inlineFrags.push(link);
        } else if (link.classList.contains('link-block')) {
          blkLinks.autoBlocks.push(link);
        }
      });
    return blkLinks;
  }, { inlineFrags: [], autoBlocks: [] });

  const embeddedLinks = [...blockLinks.inlineFrags, ...blockLinks.autoBlocks];
  if (embeddedLinks.length) {
    links = links.filter((link) => !embeddedLinks.includes(link));
  }
  section.className = 'section';
  section.dataset.status = 'decorated';
  section.dataset.idx = idx;
  return {
    blocks: [...links, ...blocks],
    el: section,
    idx,
    preloadLinks: filterDuplicatedLinkBlocks(blockLinks.autoBlocks),
  };
}

export function loadLink(href, { as, callback, crossorigin, rel, fetchpriority } = {}) {
  let link = document.head.querySelector(`link[href="${href}"]`);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    if (as) link.setAttribute('as', as);
    if (crossorigin) link.setAttribute('crossorigin', crossorigin);
    if (fetchpriority) link.setAttribute('fetchpriority', fetchpriority);
    link.setAttribute('href', href);
    if (callback) {
      link.onload = (e) => callback(e.type);
      link.onerror = (e) => callback(e.type);
    }
    document.head.appendChild(link);
  } else if (callback) {
    callback('noop');
  }
  return link;
}

export function loadStyle(href, callback) {
  if (window.app && window.app.BUILD_MODE === 'builtin') {
    return null;
  }
  return loadLink(href, { rel: 'stylesheet', callback });
}

/** Parse icon-* class value into name and optional size
 * (e.g. "chevron-right-s" -> { name: "chevron-right", size: "s" }). */
export function parseIconClass(value) {
  if (!value) return { name: '', size: undefined };
  const sizes = ['xxl', 'xl', 'l', 'm', 's'];
  for (const size of sizes) {
    const suffix = `-${size}`;
    if (value.endsWith(suffix)) {
      return { name: value.slice(0, -suffix.length), size };
    }
  }
  return { name: value, size: undefined };
}

/** Spectrum icon size CSS variables (same as sp-icon). */
const SPECTRUM_ICON_SIZE_VAR = {
  s: 'var(--spectrum-workflow-icon-size-75)',
  m: 'var(--spectrum-workflow-icon-size-100)',
  l: 'var(--spectrum-workflow-icon-size-200)',
  xl: 'var(--spectrum-workflow-icon-size-300)',
  xxl: 'var(--spectrum-workflow-icon-size-xxl)',
};

function applyIconSizeToSvg(svg, size) {
  if (!svg || !size || !SPECTRUM_ICON_SIZE_VAR[size]) return;
  const sizeVar = SPECTRUM_ICON_SIZE_VAR[size];
  svg.style.width = sizeVar;
  svg.style.height = sizeVar;
  svg.setAttribute('data-icon-size', size);
}

/** Cache for fetched content icons (iconName -> SVG element). */
const contentIconCache = new Map();

/**
 * Fetch and parse an SVG from the given URL. Returns the SVG element or null.
 * @param {string} url - Full URL to the SVG
 * @param {string} iconName - Name used for cache key
 * @returns {Promise<SVGElement|null>}
 */
async function fetchAndParseSVG(url, iconName) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  svg.setAttribute('data-icon', iconName);
  return document.adoptNode(svg);
}

/**
 * Fetch an icon SVG from the current site's docs/library/icons (e.g. when not in Spectrum).
 * Uses config base/contentRoot; path is {base}/docs/library/icons/{iconName}.svg.
 * Results are cached by iconName. Callers receive a clone so the icon can be appended safely.
 * @param {string} iconName - Icon name without extension (e.g. 'search', 'chevron-right')
 * @returns {Promise<SVGElement|null>} A clone of the SVG element, or null if fetch/parse fails
 */
export async function fetchContentIcon(iconName) {
  if (!iconName?.trim()) return null;
  const key = iconName.trim();
  if (contentIconCache.has(key)) return contentIconCache.get(key).cloneNode(true);
  const config = getConfig();
  const bases = [
    (config.base || config.contentRoot || '').toString().replace(/\/$/, ''),
    window.location.origin,
  ].filter(Boolean);
  for (const base of bases) {
    const path = `${base}/docs/library/icons/${key}.svg`;
    try {
      const svgElement = await fetchAndParseSVG(path, key);
      if (svgElement) {
        contentIconCache.set(key, svgElement);
        return svgElement.cloneNode(true);
      }
    } catch {
      /* try next base */
    }
  }
  return null;
}

async function decorateIcons(area, config) {
  const icons = area.querySelectorAll('span.icon');
  if (icons.length === 0) return;
  const { iconsExcludeBlocks } = config;
  if (iconsExcludeBlocks) {
    const excludedIconsCount = [...icons].filter(
      (icon) => iconsExcludeBlocks.some((block) => icon.closest(`div.${block}`)),
    ).length;
    if (excludedIconsCount === icons.length) return;
  }
  for (const span of icons) {
    const iconClass = [...(span.classList || [])].find((c) => c.startsWith('icon-'))?.slice(5) ?? '';
    const { name, size } = parseIconClass(iconClass);
    if (!name) continue;
    const svg = await fetchContentIcon(name);
    if (svg) {
      applyIconSizeToSvg(svg, size);
      const label = span.getAttribute('aria-label');
      if (label) svg.setAttribute('aria-label', label);
      span.replaceWith(svg);
    } else {
      // console.warn(`Icon "${name}" not found in library.`);
    }
  }
}

/**
 * Resolve an icon by name from docs/library/icons. Use in blocks (e.g. row-card).
 * @param {string} name - Icon name without extension (e.g. 'search', 'chevron-down')
 * @param {{ size?: string, label?: string }} [options] - Optional size (s|m|l|xl|xxl) and aria-label
 * @returns {Promise<SVGElement|null>} The icon SVG or null
 */
export async function resolveIcon(name, options = {}) {
  if (!name?.trim()) return null;
  const n = name.trim();
  const { size, label } = options;
  const svg = await fetchContentIcon(n);
  if (svg) {
    applyIconSizeToSvg(svg, size);
    if (label) svg.setAttribute('aria-label', label);
    return svg;
  }
  return null;
}

/**
 * Loads a CSS file.
 * @param {string} href URL to the CSS file
 */
async function loadCSS(href) {
  if (window.app && window.app.BUILD_MODE === 'builtin') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (!document.querySelector(`head > link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.append(link);
    } else {
      resolve();
    }
  });
}

/**
 * Loads JS and CSS for a block.
 * When BUILD_MODE is 'builtin', uses window.xeBlockRegistry (set by init.js) so block logic
 * runs when the package is bundled by a host (e.g. nest) without relying on dynamic import.
 * @param {Element} block The block element
 */
export async function loadBlock(block) {
  const status = block.dataset.blockStatus;
  if (status !== 'loading' && status !== 'loaded') {
    block.dataset.blockStatus = 'loading';
    const { blockName } = (!block.dataset || !block.dataset.blockName)
      ? { blockName: block.classList[0] }
      : block.dataset;
    try {
      const builtin = window.app?.BUILD_MODE === 'builtin' && window.xeBlockRegistry?.[blockName];
      if (builtin) {
        await Promise.all([
          loadCSS(`${window.hlx?.codeBasePath || ''}/blocks/${blockName}/${blockName}.css`),
          (async () => {
            const decorate = window.xeBlockRegistry[blockName];
            if (typeof decorate === 'function') {
              await decorate(block);
            }
          })(),
        ]);
      } else {
        const cssLoaded = loadCSS(`${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.css`);
        const decorationComplete = new Promise((resolve) => {
          (async () => {
            try {
              const mod = await import(
                `../blocks/${blockName}/${blockName}.js`
              );
              if (mod.default) {
                await mod.default(block);
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.log(`failed to load module for ${blockName}`, error);
            }
            resolve();
          })();
        });
        await Promise.all([cssLoaded, decorationComplete]);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`failed to load block ${blockName}`, error);
    }
    block.dataset.blockStatus = 'loaded';
  }
  return block;
}

export function partition(arr, fn) {
  return arr.reduce(
    (acc, val, i, ar) => {
      acc[fn(val, i, ar) ? 0 : 1].push(val);
      return acc;
    },
    [[], []],
  );
}

async function processSection(section, config) {
  await Promise.all([
    decorateIcons(section.el, config),
  ]);
  const loadBlocks = [];
  if (section.preloadLinks.length) {
    const [modals, blocks] = partition(section.preloadLinks, (block) => block.classList.contains('modal'));
    await Promise.all(blocks.map((block) => loadBlock(block)));
    modals.forEach((block) => loadBlock(block));
  }

  section.blocks.forEach((block) => loadBlocks.push(loadBlock(block)));

  // Only move on to the next section when all blocks are loaded.
  await Promise.all(loadBlocks);

  delete section.el.dataset.status;
  delete section.el.dataset.idx;
  return section.blocks;
}

async function decorateSections(el, isDoc) {
  const selector = isDoc ? 'body > main > div' : ':scope > div';
  const sectionElements = [...el.querySelectorAll(selector)];
  return Promise.all(sectionElements.map((section, idx) => decorateSection(section, idx)));
}

/**
 * Scroll the first element with id matching the hash into view.
 * @param {string} hash - e.g. "#section-id"
 * @param {Document|Element} [scope=document] - Root to search in (document for full page, or container for fragment)
 */
export function scrollToHashedElement(hash, scope = document) {
  const id = hash?.replace(/^#/, '').trim();
  if (!id) return;
  const el = scope === document
    ? document.getElementById(id)
    : scope.querySelector(`#${CSS.escape(id)}`);
  if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
}

export async function loadArea(area = document) {
  const isDoc = area === document;
  const config = getConfig();
  const sections = await decorateSections(area, isDoc);

  // Apply page-metadata first so body classes/styles are set before other blocks
  const pageMetaBlocks = sections.flatMap((s) => s.blocks).filter((b) => b.classList?.[0] === 'page-metadata');
  await Promise.all(pageMetaBlocks.map((b) => loadBlock(b)));

  resolveLinkHrefs(area === document ? document.body : area);

  const areaBlocks = [];
  for (const section of sections) {
    const sectionBlocks = await processSection(section, config);
    areaBlocks.push(...sectionBlocks);

    areaBlocks.forEach((block) => {
      if (!block.className.includes('metadata')) block.dataset.block = '';
    });
  }

  const currentHash = window.location.hash;
  if (currentHash) {
    scrollToHashedElement(currentHash, area === document ? document : area);
  }
}

/**
 * Normalize a link href for comparison (same-origin → pathname + search + hash, else full href).
 * @param {string} href - Link href
 * @returns {string}
 */
export function localizeLink(href) {
  if (!href || typeof href !== 'string') return '';
  try {
    const u = new URL(href, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search + u.hash : u.href;
  } catch {
    return href;
  }
}

export function createTag(tag, attributes, html, options = {}) {
  const el = document.createElement(tag);
  if (html) {
    if (html instanceof HTMLElement
      || html instanceof SVGElement
      || html instanceof DocumentFragment) {
      el.append(html);
    } else if (Array.isArray(html)) {
      el.append(...html);
    } else {
      el.insertAdjacentHTML('beforeend', html);
    }
  }
  if (attributes) {
    Object.entries(attributes).forEach(([key, val]) => {
      el.setAttribute(key, val);
    });
  }
  options.parent?.append(el);
  return el;
}

const RETRY_STATUSES = [425, 503];
const RETRY_DELAY_MS = 1500;
const RETRY_MAX_ATTEMPTS = 3;

/**
 * Fetch a URL with retries on 425 Too Early / 503 Service Unavailable.
 * @param {string} url - Absolute URL to fetch
 * @param {{ resolveUrl?: (url: string) => string; maxAttempts?: number;
 * retryStatuses?: number[]; delayMs?: number }} [opts]
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, opts = {}) {
  const {
    resolveUrl,
    maxAttempts = RETRY_MAX_ATTEMPTS,
    retryStatuses = RETRY_STATUSES,
    delayMs = RETRY_DELAY_MS,
  } = opts;
  const fetchUrl = resolveUrl ? resolveUrl(url) : url;
  let lastResponse;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(fetchUrl, { cache: 'default' });
    lastResponse = response;
    if (response.ok || !retryStatuses.includes(response.status)) return response;
    if (attempt < maxAttempts - 1) await new Promise((r) => { setTimeout(r, delayMs); });
  }
  return lastResponse;
}

/**
 * Fetch a media URL (image, etc.) with retry on 425/503 and return a blob URL for use in img src.
 * Caller should revoke the blob URL when no longer needed to avoid leaks.
 * @param {string} url - Absolute URL (e.g. image)
 * @param {{ resolveUrl?: (url: string) => string }} [opts]
 * @returns {Promise<string>} Resolves to blob URL, or original url on non-ok response after retries
 */
export async function fetchMediaAsBlobUrl(url, opts = {}) {
  try {
    const response = await fetchWithRetry(url, opts);
    if (!response.ok) return url;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return url;
  }
}

/**
 * @param {Object} opts
 * @param {string} opts.resource - Fragment URL (relative or absolute)
 * @param {boolean} [opts.withCacheRules]
 * @param {(url: string) => string} [opts.resolveUrl] - Optional; return the URL to actually fetch (e.g. CORS proxy).
 * Rewriting still uses resource as base.
 */
export async function customFetch({ resource, withCacheRules, resolveUrl }) {
  const options = {};
  if (withCacheRules) {
    const params = new URLSearchParams(window.location.search);
    options.cache = params.get('cache') === 'off' ? 'reload' : 'default';
  }

  const baseUrl = /^https?:\/\//i.test(resource)
    ? new URL(resource)
    : new URL(resource, window.location.origin);
  // HACK: Adding a forced cache bust to avoid cache issues
  baseUrl.searchParams.set('cb', new Date().getTime());
  const fetchUrl = typeof resolveUrl === 'function' ? resolveUrl(baseUrl.toString()) : baseUrl.toString();
  const response = await fetch(fetchUrl, options);
  if (!resource.endsWith('.plain.html')) {
    return response;
  }

  const html = await response.text();
  const escapeForHtmlAttr = (url) => String(url).replace(/&/g, '&amp;');
  const decodePath = (p) => String(p).replace(/&amp;/gi, '&').replace(/&#x26;/gi, '&').replace(/&#38;/gi, '&');
  const processedHtml = html.replace(
    /(href|src|srcset)="(\.\/[^"\s]*|\.\.\/[^"\s]*|[^"/][^"\s]*)"/g,
    (match, attr, path) => {
      const raw = decodePath(path);
      if (raw.startsWith('http') || raw.startsWith('//') || raw.startsWith('data:')) {
        return match;
      }
      if (attr === 'srcset') {
        const value = raw
          .split(',')
          .map((url) => {
            const [urlPart, size] = url.trim().split(' ');
            const decoded = decodePath(urlPart);
            if (decoded.startsWith('http') || decoded.startsWith('//') || decoded.startsWith('data:')) {
              return url.trim();
            }
            return `${new URL(decoded, baseUrl).href}${size ? ` ${size}` : ''}`;
          })
          .join(', ');
        return `srcset="${escapeForHtmlAttr(value)}"`;
      }
      return `${attr}="${escapeForHtmlAttr(new URL(raw, baseUrl).href)}"`;
    },
  );
  return new Response(processedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: { 'Content-Type': 'text/html' },
  });
}
