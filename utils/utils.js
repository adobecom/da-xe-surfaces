const MILO_BLOCKS = [
  'fragment',
  'hva-card',
  'page-metadata',
  'section-metadata',
  'video',
];

const AUTO_BLOCKS = [
  { adobetv: 'tv.adobe.com' },
  { gist: 'https://gist.github.com' },
  // { caas: '/tools/caas' },
  // { faas: '/tools/faas' },
  { fragment: '/de-xe-surfaces/', styles: false },
  // { instagram: 'https://www.instagram.com' },
  // { slideshare: 'https://www.slideshare.net', styles: false },
  // { tiktok: 'https://www.tiktok.com', styles: false },
  // { twitter: 'https://twitter.com' },
  { vimeo: 'https://vimeo.com' },
  { vimeo: 'https://player.vimeo.com' },
  { youtube: 'https://www.youtube.com' },
  { youtube: 'https://youtu.be' },
  // { 'pdf-viewer': '.pdf', styles: false },
  { video: '.mp4' },
  // { merch: '/tools/ost?' },
  // { 'mas-autoblock': 'mas.adobe.com/studio' },
];

const DO_NOT_INLINE = [
  'accordion',
  'columns',
  'z-pattern',
];

const PAGE_URL = new URL(window.location.href);
const LANGSTORE = 'langstore';
const PREVIEW = 'target-preview';

export const SLD = PAGE_URL.hostname.includes('.aem.') ? 'aem' : 'hlx';

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

export function getLocale(locales, pathname = window.location.pathname) {
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

export function getEnv(conf) {
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

export const [setConfig, updateConfig, getConfig] = (() => {
  let config = {};
  return [
    (conf) => {
      window.hlx = window.hlx || {};
      window.hlx.config = conf;

      const origin = conf.origin || window.location.origin;
      const pathname = conf.pathname || window.location.pathname;
      config = { env: getEnv(conf), ...conf };
      config.codeRoot = conf.codeRoot ? `${origin}${conf.codeRoot}` : origin;
      config.base = config.miloLibs || config.codeRoot;
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
        console.log('Invalid or missing locale:', e);
      }
      config.locale.contentRoot = `${origin}${config.locale.prefix}${config.contentRoot ?? ''}`;
      config.useDotHtml = !PAGE_URL.origin.includes(`.${SLD}.`)
        && (conf.useDotHtml ?? PAGE_URL.pathname.endsWith('.html'));
      config.entitlements = handleEntitlements;
      config.consumerEntitlements = conf.entitlements || [];
      setupMiloObj(config);
      return config;
    },
    (conf) => (config = conf),
    () => config,
  ];
})();

export function decorateImageLinks(el) {
  const images = el.querySelectorAll('img[alt*="|"]');
  if (!images.length) return;
  [...images].forEach((img) => {
    const [source, alt, icon] = img.alt.split('|');
    try {
      const url = new URL(source.trim());
      const href = url.hostname.includes(`.${SLD}.`) ? `${url.pathname}${url.hash}` : url.href;
      if (alt?.trim().length) img.alt = alt.trim();
      const pic = img.closest('picture');
      const picParent = pic.parentElement;
      if (href.includes('.mp4')) {
        const a = createTag('a', { href: url, 'data-video-poster': pic.outerHTML });
        a.innerHTML = url;
        pic.replaceWith(a);
      } else {
        const aTag = createTag('a', { href, class: 'image-link' });
        picParent.insertBefore(aTag, pic);
        if (icon) {
        } else {
          aTag.append(pic);
        }
      }
    } catch (e) {
      console.log('Error:', `${e.message} '${source.trim()}'`);
    }
  });
}

export function appendHtmlToLink(link) {
  const { useDotHtml } = getConfig();
  if (!useDotHtml) return;
  const href = link.getAttribute('href');
  if (!href?.length) return;

  const { autoBlocks = [], htmlExclude = [] } = getConfig();

  const HAS_EXTENSION = /\..*$/;
  let url = { pathname: href };

  try { url = new URL(href, PAGE_URL); } catch (e) { /* do nothing */ }

  if (!(href.startsWith('/') || href.startsWith(PAGE_URL.origin))
    || url.pathname?.endsWith('/')
    || href === PAGE_URL.origin
    || HAS_EXTENSION.test(href.split('/').pop())
    || htmlExclude?.some((excludeRe) => excludeRe.test(href))) {
    return;
  }

  const relativeAutoBlocks = autoBlocks
    .map((b) => Object.values(b)[0])
    .filter((b) => b.startsWith('/'));
  const isAutoblockLink = relativeAutoBlocks.some((block) => href.includes(block));
  if (isAutoblockLink) return;

  try {
    const linkUrl = new URL(href.startsWith('http') ? href : `${PAGE_URL.origin}${href}`);
    if (linkUrl.pathname && !linkUrl.pathname.endsWith('.html')) {
      linkUrl.pathname = `${linkUrl.pathname}.html`;
      link.setAttribute('href', href.startsWith('/')
        ? `${linkUrl.pathname}${linkUrl.search}${linkUrl.hash}`
        : linkUrl.href);
    }
  } catch (e) {
    window.lana?.log(`Error while attempting to append '.html' to ${link}: ${e}`);
  }
}

export function decorateSVG(a) {
  const { textContent, href } = a;
  if (!(textContent.includes('.svg') || href.includes('.svg'))) return a;
  try {
    // Mine for URL and alt text
    const splitText = textContent.split('|');
    const authoredUrl = new URL(splitText.shift().trim());
    const altText = splitText.join('|').trim();

    // Relative link checking
    const hrefUrl = a.href.startsWith('/')
      ? new URL(`${window.location.origin}${a.href}`)
      : new URL(a.href);

    const src = (authoredUrl.hostname.includes('.hlx.') || authoredUrl.hostname.includes('.aem.'))
      ? authoredUrl.pathname
      : authoredUrl;

    const img = createTag('img', { loading: 'lazy', src, alt: altText || '' });
    const pic = createTag('picture', null, img);

    if (authoredUrl.pathname === hrefUrl.pathname) {
      a.parentElement.replaceChild(pic, a);
      return pic;
    }
    a.textContent = '';
    a.append(pic);
    return a;
  } catch (e) {
    console.log('Failed to create SVG.', e.message);
    return a;
  }
}

export function decorateAutoBlock(a) {
  const config = getConfig();
  const { hostname } = window.location;
  let url;
  try {
    url = new URL(a.href);
  } catch (e) {
    window.lana?.log(`Cannot make URL from decorateAutoBlock - ${a?.href}: ${e.toString()}`);
    return false;
  }

  const href = hostname === url.hostname
  ? `${url.pathname}${url.search}${url.hash}`
  : a.href;

  return config.autoBlocks.find((candidate) => {
    const key = Object.keys(candidate)[0];
    const match = href.includes(candidate[key]);
    if (!match) return false;

    if (key === 'pdf-viewer' && !a.textContent.includes('.pdf')) {
      a.target = '_blank';
      return false;
    }

    const hasExtension = a.href.split('/').pop().includes('.');
    const mp4Match = a.textContent.match('media_.*.mp4');
    if (key === 'fragment' && (!hasExtension || mp4Match)) {
      if (a.href === window.location.href) {
        return false;
      }

      const isInlineFrag = url.hash.includes('#_inline');
      if (url.hash === '' || isInlineFrag) {
        const { parentElement } = a;
        const { nodeName, innerHTML } = parentElement;
        const noText = innerHTML === a.outerHTML;
        if (noText && nodeName === 'P') {
          const div = createTag('div', null, a);
          parentElement.parentElement.replaceChild(div, parentElement);
        }
      }

      // previewing a fragment page with mp4 video
      if (mp4Match) {
        a.className = 'video link-block';
        return false;
      }

      // Modals
      if (url.hash !== '' && !isInlineFrag) {
        a.dataset.modalPath = url.pathname;
        a.dataset.modalHash = url.hash;
        a.href = url.hash;
        a.className = `modal link-block ${[...a.classList].join(' ')}`;
        return true;
      }
    }

    // slack uploaded mp4s
    if (key === 'video' && !a.textContent.match('media_.*.mp4')) {
      return false;
    }

    a.className = `${key} link-block`;
    return true;
  });
}

const decorateCopyLink = (a, evt) => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|mobile/.test(userAgent) && !/ipad/.test(userAgent);
  if (!isMobile || !navigator.share) {
    a.remove();
    return;
  }
  const link = a.href.replace(evt, '');
  const isConButton = ['EM', 'STRONG'].includes(a.parentElement.nodeName)
    || a.classList.contains('con-button');
  if (!isConButton) a.classList.add('static', 'copy-link');
  a.href = '';
  a.addEventListener('click', async (e) => {
    e.preventDefault();
    if (navigator.share) await navigator.share({ title: link, url: link });
  });
};

export function convertStageLinks({ anchors, config, hostname, href }) {
  const { env, stageDomainsMap, locale } = config;
  if (env?.name === 'prod' || !stageDomainsMap) return;
  const matchedRules = Object.entries(stageDomainsMap)
    .find(([domain]) => (new RegExp(domain)).test(href));
  if (!matchedRules) return;
  const [, domainsMap] = matchedRules;
  [...anchors].forEach((a) => {
    const hasLocalePrefix = a.pathname.startsWith(`${locale.prefix}/`);
    const noLocaleLink = hasLocalePrefix ? a.href.replace(locale.prefix, '') : a.href;
    const matchedDomain = Object.keys(domainsMap)
      .find((domain) => (new RegExp(domain)).test(noLocaleLink));
    if (!matchedDomain) return;
    const convertedLink = noLocaleLink.replace(
      new RegExp(matchedDomain),
      domainsMap[matchedDomain] === 'origin'
        ? `${matchedDomain.includes('https') ? 'https://' : ''}${hostname}`
        : domainsMap[matchedDomain],
    );
    const convertedUrl = new URL(convertedLink);
    convertedUrl.pathname = `${hasLocalePrefix ? locale.prefix : ''}${convertedUrl.pathname}`;
    a.href = convertedUrl.toString();
    if (/(\.page|\.live).*\.html(?=[?#]|$)/.test(a.href)) a.href = a.href.replace(/\.html(?=[?#]|$)/, '');
  });
}

export function decorateLinks(el) {
  const config = getConfig();
  decorateImageLinks(el);
  const anchors = el.getElementsByTagName('a');
  const { hostname, href } = window.location;
  const links = [...anchors].reduce((rdx, a) => {
    appendHtmlToLink(a);
    if (a.href.includes('http:')) a.setAttribute('data-http-link', 'true');
    a.href = localizeLink(a.href);
    decorateSVG(a);
    if (a.href.includes('#_blank')) {
      a.setAttribute('target', '_blank');
      a.href = a.href.replace('#_blank', '');
    }
    if (a.href.includes('#_nofollow')) {
      a.setAttribute('rel', 'nofollow');
      a.href = a.href.replace('#_nofollow', '');
    }
    if (a.href.includes('#_dnb')) {
      a.href = a.href.replace('#_dnb', '');
    } else {
      const autoBlock = decorateAutoBlock(a);
      if (autoBlock) {
        rdx.push(a);
      }
    }
    // Custom action links
    const loginEvent = '#_evt-login';
    if (a.href.includes(loginEvent)) {
      a.href = a.href.replace(loginEvent, '');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const { signInContext } = config;
        window.adobeIMS?.signIn(signInContext);
      });
    }
    const copyEvent = '#_evt-copy';
    if (a.href.includes(copyEvent)) {
      decorateCopyLink(a, copyEvent);
    }
    const branchQuickLink = 'app.link';

    if (a.href.includes(branchQuickLink)) {
      (async () => {
      })();
    }
    // Append aria-label
    const pipeRegex = /\s?\|([^|]*)$/;
    if (pipeRegex.test(a.textContent) && !/\.[a-z]+/i.test(a.textContent)) {
      const node = [...a.childNodes].reverse()[0];
      const ariaLabel = node.textContent.match(pipeRegex)[1];
      node.textContent = node.textContent.replace(pipeRegex, '');
      a.setAttribute('aria-label', ariaLabel.trim());
    }

    return rdx;
  }, []);
  convertStageLinks({ anchors, config, hostname, href });
  return links;
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

function decorateSection(section, idx) {
  let links = decorateLinks(section);
  // decorateDefaults(section);
  const blocks = section.querySelectorAll(':scope > div[class]:not(.content)');
  blocks.forEach((el) => { if (!el.classList.contains('block')) el.classList.add('block'); });

  const { doNotInline } = getConfig();
  const blockLinks = [...blocks].reduce((blkLinks, block) => {
    const blockName = block.classList[0];
    links.filter((link) => block.contains(link))
      .forEach((link) => {
        if (link.classList.contains('fragment')
          && MILO_BLOCKS.includes(blockName) // do not inline consumer blocks (for now)
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

async function resolveInlineFrags(section) {
  const inlineFrags = [...section.el.querySelectorAll('a[href*="#_inline"]')];
  if (!inlineFrags.length) return;
  const { default: loadInlineFrags } = await import('../blocks/fragment/fragment.js');
  const fragPromises = inlineFrags.map((link) => loadInlineFrags(link));
  await Promise.all(fragPromises);
  const newlyDecoratedSection = decorateSection(section.el, section.idx);
  section.blocks = newlyDecoratedSection.blocks;
  section.preloadLinks = newlyDecoratedSection.preloadLinks;
}


const findReplaceableNodes = (area) => {
  const regex = /{{(.*?)}}|%7B%7B(.*?)%7D%7D/g;
  const walker = document.createTreeWalker(area, NodeFilter.SHOW_ALL);
  const nodes = [];
  let node = walker.nextNode();
  while (node !== null) {
    let matchFound = false;
    if (node.nodeType === Node.TEXT_NODE) {
      matchFound = regex.test(node.nodeValue);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('href')) {
      const hrefValue = node.getAttribute('href');
      matchFound = regex.test(hrefValue);
    }
    if (matchFound) {
      nodes.push(node);
      regex.lastIndex = 0;
    }
    node = walker.nextNode();
  }
  return nodes;
};



let placeholderRequest;
export async function decoratePlaceholders(area, config) {
  if (!area) return;
  const nodes = findReplaceableNodes(area);
  if (!nodes.length) return;
  area.dataset.hasPlaceholders = 'true';
  const placeholderPath = `${config.locale?.contentRoot}/placeholders.json`;
  placeholderRequest = placeholderRequest
    || customFetch({ resource: placeholderPath, withCacheRules: true })
      .catch(() => ({}));
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
  if (window.app && window.app.BUILD_MODE === "builtin") {
    return null;
  }
  return loadLink(href, { rel: 'stylesheet', callback });
}

async function decorateIcons(area, config) {
  let icons = area.querySelectorAll('span.icon');
  if (icons.length === 0) return;
  const { base, iconsExcludeBlocks } = config;
  if (iconsExcludeBlocks) {
      const excludedIconsCount = [...icons].filter((icon) => iconsExcludeBlocks.some((block) => icon.closest(`div.${block}`))).length;
      if (excludedIconsCount === icons.length) return;
  }
  loadStyle(`${base}/features/icons/icons.css`);
  const { default: loadIcons } = await import('../features/icons/icons.js');
  await loadIcons(icons, config);
}

/**
 * Loads a CSS file.
 * @param {string} href URL to the CSS file
 */
async function loadCSS(href) {
  if (window.app && window.app.BUILD_MODE === "builtin") {
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
 * @param {Element} block The block element
 */
export async function loadBlock(block) {
  const status = block.dataset.blockStatus;
  if (status !== 'loading' && status !== 'loaded') {
    block.dataset.blockStatus = 'loading';
    const { blockName } = (!block.dataset || !block.dataset.blockName) ? { blockName: block.classList[0] } : block.dataset;
    try {
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


async function processSection(section, config, isDoc) {
  await resolveInlineFrags(section);
  await Promise.all([
    decoratePlaceholders(section.el, config),
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

function decorateSections(el, isDoc) {
  const selector = isDoc ? 'body > main > div' : ':scope > div';
  return [...el.querySelectorAll(selector)].map(decorateSection);
}

export async function loadArea(area = document) {
  const isDoc = area === document;
  const config = getConfig();
  const sections = decorateSections(area, isDoc);

  // Apply page-metadata first so body classes/styles are set before other blocks
  const pageMetaBlocks = sections.flatMap((s) => s.blocks).filter((b) => b.classList?.[0] === 'page-metadata');
  await Promise.all(pageMetaBlocks.map((b) => loadBlock(b)));

  const areaBlocks = [];
  for (const section of sections) {
    const sectionBlocks = await processSection(section, config, isDoc);
    areaBlocks.push(...sectionBlocks);

    areaBlocks.forEach((block) => {
      if (!block.className.includes('metadata')) block.dataset.block = '';
    });
  }

  // const currentHash = window.location.hash;
  // if (currentHash) {
  //   scrollToHashedElement(currentHash);
  // }
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

function getExtension(path) {
  const pageName = path.split('/').pop();
  return pageName.includes('.') ? pageName.split('.').pop() : '';
}

export function localizeLink(
  href,
  originHostName = window.location.hostname,
  overrideDomain = false,
) {
  try {
    const url = new URL(href);
    const relative = url.hostname === originHostName;
    const processedHref = relative ? href.replace(url.origin, '') : href;
    const { hash } = url;
    // don't localize links with #_dnt
    if (hash.includes('#_dnt')) return processedHref.replace('#_dnt', '');
    const path = url.pathname;
    const extension = getExtension(path);
    const allowedExts = ['', 'html', 'json'];
    if (!allowedExts.includes(extension)) return processedHref;
    const { locale, locales, prodDomains } = getConfig();
    if (!locale || !locales) return processedHref;
    const isLocalizable = relative || (prodDomains && prodDomains.includes(url.hostname))
      || overrideDomain;
    if (!isLocalizable) return processedHref;
    const isLocalizedLink = path.startsWith(`/${LANGSTORE}`)
      || path.startsWith(`/${PREVIEW}`)
      || Object.keys(locales).some((loc) => loc !== '' && (path.startsWith(`/${loc}/`)
        || path.endsWith(`/${loc}`)));
    if (isLocalizedLink) return processedHref;
    const urlPath = `${locale.prefix}${path}${url.search}${hash}`;
    return relative ? urlPath : `${url.origin}${urlPath}`;
  } catch (error) {
    return href;
  }
}

export async function customFetch({ resource, withCacheRules }) {
  const options = {};
  if (withCacheRules) {
    const params = new URLSearchParams(window.location.search);
    options.cache = params.get('cache') === 'off' ? 'reload' : 'default';
  }

  const baseUrl = new URL(resource);
  // HACK: Adding a forced cache bust to avoid cache issues
  baseUrl.searchParams.set('cb', new Date().getTime());
  const response = await fetch(baseUrl.toString(), options);
  if (!resource.endsWith('.plain.html')) {
    return response;
  }

  const html = await response.text();
  const processedHtml = html.replace(
    /(href|src|srcset)="(\.\/[^"\s]*|\.\.\/[^"\s]*|[^"\/][^"\s]*)"/g,
    (match, attr, path) => {
      if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) {
        return match;
      }
      if (attr === 'srcset') {
        return `srcset="${path
          .split(',')
          .map((url) => {
            const [urlPart, size] = url.trim().split(' ');
            if (urlPart.startsWith('http') || urlPart.startsWith('//') || urlPart.startsWith('data:')) {
              return url;
            }
            return `${new URL(urlPart, baseUrl).href}${size ? ` ${size}` : ''}`;
          })
          .join(', ')}"`;
      }
      return `${attr}="${new URL(path, baseUrl).href}"`;
    }
  );
  return new Response(processedHtml, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export function createIntersectionObserver({ el, callback, once = true, options = {} }) {
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        if (once) observer.unobserve(entry.target);
        callback(entry.target, entry);
      }
    });
  }, options);
  io.observe(el);
  return io;
}

export function isInTextNode(node) {
  return (node.parentElement.childNodes.length > 1 && node.parentElement.firstChild.tagName === 'A') || node.parentElement.firstChild.nodeType === Node.TEXT_NODE;
}

