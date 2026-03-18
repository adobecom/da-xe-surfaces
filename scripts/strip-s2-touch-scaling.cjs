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

/**
 * Strips S2 touch scaling: removes @media not ((hover: hover) and (pointer: fine)) rules.
 * Same behavior as Nest's @adobehome/parcel-transformer-no-s2-scaling so xe-sites
 * S2 typography matches Nest (no font-size bump on mobile) in both head.html and Nest.
 */
// eslint-disable-next-line import/no-extraneous-dependencies -- build-time only (webpack loader)
const { transform } = require('lightningcss');

/** @type {(args: { filePath: string, code: string }) => string} */
function applyTransform({ filePath, code }) {
  let didMatch = false;

  const result = transform({
    filename: filePath,
    minify: false,
    code: Buffer.from(code),
    errorRecovery: true,
    visitor: {
      Rule: {
        media(rule) {
          if (rule.value.query.mediaQueries.length !== 1) {
            return;
          }
          const query = rule.value.query.mediaQueries[0];
          if (
            query.mediaType === 'all'
            && query.condition.type === 'not'
            && query.condition.value.type === 'operation'
            && query.condition.value.conditions.length === 2
            && query.condition.value.conditions[0].type === 'feature'
            && query.condition.value.conditions[0].value.type === 'plain'
            && query.condition.value.conditions[0].value.name === 'hover'
            && query.condition.value.conditions[0].value.value.type === 'ident'
            && query.condition.value.conditions[0].value.value.value === 'hover'
            && query.condition.value.conditions[1].type === 'feature'
            && query.condition.value.conditions[1].value.type === 'plain'
            && query.condition.value.conditions[1].value.name === 'pointer'
            && query.condition.value.conditions[1].value.value.type === 'ident'
            && query.condition.value.conditions[1].value.value.value === 'fine'
          ) {
            didMatch = true;
            // lightningcss visitor: return [] removes this rule
            return []; // eslint-disable-line consistent-return
          }
        },
      },
    },
  });

  if (didMatch) {
    return result.code.toString();
  }
  return code;
}

module.exports = { applyTransform };
