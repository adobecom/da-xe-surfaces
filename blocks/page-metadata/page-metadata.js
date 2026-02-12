/**
 * Page-metadata block: key/value rows (e.g. Style | Value) are applied to the whole page.
 * Supported keys: "class" (or "classes"), "style" → added to document.body (classes or data-style).
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
      body.dataset.style = value;
      body.classList.add(value);
    } else if (key === 'padding') {
      body.style.padding = value;
    } else {
      body.dataset[key.replace(/\s+/g, '-')] = value;
    }
  });
}
