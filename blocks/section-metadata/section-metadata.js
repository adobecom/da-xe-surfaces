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
 * Layout: masonry-layout, grid-width-6, grid-width-8, grid-width-10,
 *   grid-template-columns-1-2, grid-template-columns-2-1, grid-template-columns-1-3, grid-template-columns-3-1
 */
export async function handleStyle(text, section) {
  if (!text || !section) return;
  const styles = text.split(/\s*,\s*/).map((s) => s.trim().replaceAll(' ', '-')).filter(Boolean);
  section.classList.add(...styles);
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


export default async function init(el) {
  const section = el.parentElement;
  if (!section?.classList) return;
  section.classList.add('section');
  const metadata = getMetadata(el);
  if (metadata.style?.text) await handleStyle(metadata.style.text, section);
}
