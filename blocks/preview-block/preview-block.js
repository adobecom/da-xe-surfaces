/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Preview-block: key/value rows for redirect and preview (layout, environment, targetApp).
 * Same structure as page-metadata. Used by scripts.js for redirect-to-Boost logic.
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const getCells = (row) => [...row.children];
  const isHeaderRow = (cells) => {
    const v = (cells[1]?.textContent || '').trim().toLowerCase();
    return v === 'value' || v === 'values' || v === 'value(s)';
  };

  rows.forEach((row) => {
    const cells = getCells(row);
    if (cells.length < 2) return;
    if (isHeaderRow(cells)) return;
    const key = (cells[0].textContent || '').trim().toLowerCase().replace(/\s+/g, '-');
    const value = (cells[1].textContent || '').trim();
    if (!key || !value) return;
    block.dataset[key] = value;
  });
}
