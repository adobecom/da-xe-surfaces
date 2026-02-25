/**
 * Page-metadata block: key/value rows (e.g. Style | Value) are applied to the whole page.
 * Supported keys:
 * - "class" (or "classes") → added to document.body
 * - "style" → spacing pattern → sp-theme/body; else data-style + class
 * - "analyticsParams" → "name: X | id: Y" sets data-content-name, data-content-id
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const { body } = document;
  const getCells = (row) => [...row.children];
  const isHeaderRow = (cells) => {
    const secondCell = cells[1];
    const v = (secondCell?.textContent || '').trim().toLowerCase();
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
    } else if (key === 'analyticsparams' || key === 'analytics-params') {
      // Parse pipe syntax: "name: Page Name | id: page-id | subcategory: X"
      const parts = value.split('|').map((p) => p.trim());

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
