import { createTag, getConfig, customFetch } from '../../utils/utils.js';

// const ADD_MORE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 10.5L3.5 6h9L8 10.5z"/></svg>';

// let placeholdersCache;
// async function replacePlaceholder(key) {
//   if (!placeholdersCache) {
//     try {
//       const config = getConfig();
//       const path = `${config.locale?.contentRoot}/placeholders.json`;
//       const res = await customFetch({ resource: path, withCacheRules: true });
//       placeholdersCache = res.ok ? await res.json() : {};
//     } catch {
//       placeholdersCache = {};
//     }
//   }
//   return placeholdersCache[key] ?? 'See more';
// }

const mediaQueries = {
  mobile: window.matchMedia('(max-width: 599px)'),
  tablet: window.matchMedia('(min-width: 600px) and (max-width: 1199px)'),
};

const applyBackground = (colors, section) => {
  if (colors.length === 1) {
    const [color] = colors;
    section.style.background = color;
    return;
  }
  if (colors.length === 2) {
    const [mobileColor, tabletDesktopColor] = colors;
    section.style.background = mediaQueries.mobile.matches ? mobileColor : tabletDesktopColor;
    return;
  }
  if (colors.length >= 3) {
    const [mobileColor, tabletColor, desktopColor] = colors;
    if (mediaQueries.mobile.matches) {
      section.style.background = mobileColor;
    } else if (mediaQueries.tablet.matches) {
      section.style.background = tabletColor;
    } else {
      section.style.background = desktopColor;
    }
  }
};

export function handleBackground(div, section) {
  const pic = div.background.content?.querySelector('picture');
  if (pic) {
    section.classList.add('has-background');
    pic.classList.add('section-background');
    // handleFocalpoint(pic, div.background.content);
    section.insertAdjacentElement('afterbegin', pic);
  } else {
    const color = div.background.content?.textContent?.trim();
    if (color) {
      const colors = color.split('|').map((c) => c.trim());
      applyBackground(colors, section);
      Object.keys(mediaQueries).forEach((key) => {
        mediaQueries[key].addEventListener('change', () => applyBackground(colors, section), 100);
      });
    }
  }
}

/**
 * Apply style classes to the section. Value is comma-separated; each token becomes a class (spaces → hyphens).
 * Supported options (any combination). Separate with comma: "center, dark" or "center,dark".
 *
 * Theme: darkest, dark, light
 * Alignment: center
 * Divider: divider, divider-inherit
 * Spacing (vertical padding): xxs-spacing, xs-spacing, s-spacing, m-spacing, l-spacing, xl-spacing, xxl-spacing, xxxl-spacing
 * Spacing top: xxs-spacing-top … xxxl-spacing-top (same scale)
 * Spacing bottom: xxs-spacing-bottom … xxxl-spacing-bottom (same scale)
 * Spacing static: xl-spacing-static, xxl-spacing-static, xxxl-spacing-static (+ -top-static, -bottom-static)
 * Padding (all sides): xxs-padding … xxxl-padding
 * Grid layout: two-up, three-up, four-up, five-up
 * Gap (with *-up): no-gap, xxs-gap, xs-gap, s-gap, l-gap, xl-gap, xxl-gap, xxxl-gap
 * Other: has-background (use with background metadata), hide-sticky-section, close-sticky-section
 * Sticky/masonry/layout: sticky-top, sticky-bottom, masonry-layout, grid-width-6, grid-width-8, grid-width-10,
 *   grid-template-columns-1-2, grid-template-columns-2-1, grid-template-columns-1-3, grid-template-columns-3-1,
 *   one-up-tablet, three-up-tablet, four-up-tablet, reverse-mobile, xl-top-rounded-corners, xl-bottom-rounded-corners,
 *   spacing-bottom-180, no-spacing-bottom-mobile, no-spacing-bottom-tablet, show-all
 */
export async function handleStyle(text, section) {
  if (!text || !section) return;
  const styles = text.split(/\s*,\s*/).map((s) => s.trim().replaceAll(' ', '-')).filter(Boolean);
  // const sticky = styles.find((style) => style === 'sticky-top' || style === 'sticky-bottom');
  // if (sticky) {
  //   const { default: handleStickySection } = await import('./sticky-section.js');
  //   await handleStickySection(sticky, section);
  // }
  // if (styles.includes('masonry')) styles.push('masonry-up');
  section.classList.add(...styles);
}

function handleMasonry(text, section) {
  section.classList.add(...['masonry-layout', 'masonry-up']);
  const divs = section.querySelectorAll(":scope > div:not([class*='metadata'])");
  const spans = [];
  text.split('\n').forEach((line) => spans.push(...line.trim().split(',')));
  [...divs].forEach((div, i) => {
    const spanWidth = spans[i] ? spans[i] : 'span 4';
    div.classList.add(`grid-${spanWidth.trim().replace(' ', '-')}`);
  });
}

function handleLayout(text, section) {
  if (!(text || section)) return;
  const layoutClass = `grid-template-columns-${text.replaceAll(' | ', '-')}`;
  section.classList.add(layoutClass);
}

export function getDelayTime(time) {
  if (time > 99) return time;
  return (time * 1000);
}

function handleDelay(time, section) {
  if (!(time || section)) return;
  section.classList.add('hide-sticky-section');
  setTimeout(() => { section.classList.remove('hide-sticky-section'); }, getDelayTime(time));
}

function handleAnchor(anchor, section) {
  if (!anchor || !section) return;
  section.id = anchor.toLowerCase().trim().replaceAll(/\s+/g, '-');
  section.classList.add('section-anchor');
}

export const getMetadata = (el) => [...el.childNodes].reduce((rdx, row) => {
  if (row.children) {
    const key = row.children[0].textContent.trim().toLowerCase();
    const content = row.children[1];
    const text = content?.textContent.trim().toLowerCase();
    if (key && content) rdx[key] = { content, text };
  }
  return rdx;
}, {});

async function createAndConfigureShowMoreButton(section, cardsCount) {
  const seeMoreText = await replacePlaceholder('see-more-features');
  const showMoreButton = createTag(
    'div',
    { class: `show-more-button${cardsCount <= 3 ? ' hidden' : ''}` },
  );
  const button = createTag('button', {}, seeMoreText);

  const iconSpan = createTag('span', {
    class: 'show-more-icon',
    'aria-hidden': 'true',
  }, `${ADD_MORE_ICON}`);
  button.appendChild(iconSpan);

  button.addEventListener('click', () => {
    section.classList.add('show-all');
    section.querySelector('.show-more-button').remove();
  });

  showMoreButton.append(button);
  return showMoreButton;
}

async function handleCollapseSection(section) {
  if (!section) return;
  const blocks = section.querySelectorAll(':scope > div:not(:last-child)');
  const showMoreButton = await createAndConfigureShowMoreButton(section, blocks.length);
  section.append(showMoreButton);
  const { decorateDefaultLinkAnalytics } = await import('../../martech/attributes.js');
  decorateDefaultLinkAnalytics(showMoreButton);
}

function addListAttrToSection(section) {
  if (!section) return;
  const isSectionUp = [...section.classList].some((c) => c.endsWith('-up'));
  const hasHeader = section.querySelector('h1, h2, h3, h4, h5, h6');
  const allowedBlocks = ['icon-block', 'action-item', 'section-metadata'];
  const hasAllowedChildren = [...section.children]
    .every((child) => allowedBlocks.some((block) => child.classList.contains(block)));
  if (!isSectionUp || hasHeader || !hasAllowedChildren) return;
  section.setAttribute('role', 'list');
  [...section.children].forEach((child) => {
    if (child.classList.contains('section-metadata')) return;
    child.setAttribute('role', 'listitem');
  });
}

export default async function init(el) {
  const section = el.parentElement;
  if (!section?.classList) return;
  section.classList.add('section');
  const metadata = getMetadata(el);
  if (metadata.style?.text) await handleStyle(metadata.style.text, section);
  // if (metadata.background) handleBackground(metadata, section);
  // if (metadata.layout) handleLayout(metadata.layout.text, section);
  // if (metadata.masonry) handleMasonry(metadata.masonry.text, section);
  // if (metadata.delay) handleDelay(metadata.delay.text, section);
  // if (metadata.anchor) handleAnchor(metadata.anchor.text, section);
  // if (metadata['collapse-ups-mobile']?.text === 'on') await handleCollapseSection(section);
  // addListAttrToSection(section);
}
