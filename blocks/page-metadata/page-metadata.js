/**
 * Page-metadata block: key/value rows (e.g. Style | Value) are applied to the whole page.
 * Supported keys:
 * - "class" (or "classes") → added to document.body
 * - "style" → if spacing pattern (e.g. "xl-spacing", "m-spacing-top"), applied to sp-theme/body;
 *             otherwise sets data-style and adds as class
 * - "analyticsParams" → pipe syntax "name: Page Name | id: page-id" sets data-content-name and data-content-id
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const body = document.body;
  const getCells = (row) => [...row.children];
  const isHeaderRow = (cells) => {
    const v = (cells[1]?.textContent || '').trim().toLowerCase();
    return v === 'value' || v === 'values' || v === 'value(s)';
  };

  rows.forEach((row) => {
    const cells = getCells(row);
    if (cells.length < 2) return;
    if (isHeaderRow(cells)) return;
    const key = (cells[0].textContent || '').trim().toLowerCase();
    const value = (cells[1].textContent || '').trim();
    if (!key || !value) return;

    if (key === 'class' || key === 'classes') {
      value.split(/\s+/).filter(Boolean).forEach((c) => body.classList.add(c));
    } else if (key === 'style') {
      // Check if it's a spacing pattern
      const spacingPattern = /^(no|xxxs?|xxs?|xs|s|m|l|xl|xxl|xxxl|ivxl|vxl)-spacing(-top|-bottom)?$/;
      if (spacingPattern.test(value.toLowerCase())) {
        const theme = body.closest('sp-theme') || body.querySelector('sp-theme');
        if (theme) {
          theme.classList.add(value.toLowerCase());
        } else {
          body.classList.add(value.toLowerCase());
        }
      } else {
        // Not a spacing pattern, treat as theme/style name
        body.dataset.style = value;
        body.classList.add(value);
      }
    } else if (key === 'analyticsparams' || key === 'analytics-params') {
      // Parse pipe syntax: "name: Page Name | id: page-id"
      const parts = value.split('|').map(p => p.trim());
      
      parts.forEach((part) => {
        const idMatch = part.match(/^id\s*:\s*(.+)$/i);
        if (idMatch) {
          body.setAttribute('data-content-id', idMatch[1].trim());
          return;
        }
        
        const nameMatch = part.match(/^name\s*:\s*(.+)$/i);
        if (nameMatch) {
          body.setAttribute('data-content-name', nameMatch[1].trim());
        }
      });
    } else {
      body.dataset[key.replace(/\s+/g, '-')] = value;
    }
  });
}
