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
      let spacingClass = value.toLowerCase().replace(/\s+/g, '-');
      const fullRegex = /^(no|xxxs?|xxs?|xs|s|m|l|xl|xxl|xxxl|ivxl|vxl)-spacing(-top|-bottom)?$/;
      const shortMatch = spacingClass.match(/^(no|xxxs?|xxs?|xs|s|m|l|xl|xxl|xxxl|ivxl|vxl)(-top|-bottom)?$/);
      if (!fullRegex.test(spacingClass) && shortMatch) {
        spacingClass = `${shortMatch[1]}-spacing${shortMatch[2] || ''}`;
      }
      if (fullRegex.test(spacingClass) || shortMatch) {
        const theme = body.closest('sp-theme') || body.querySelector('sp-theme');
        if (theme) {
          theme.classList.add(spacingClass);
        } else {
          body.classList.add(spacingClass);
        }
      } else {
        body.style.padding = value;
      }
    } else {
      body.dataset[key.replace(/\s+/g, '-')] = value;
    }
  });
}
