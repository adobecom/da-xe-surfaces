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
 * Content tree and block models for React blocks.
 * Reference: nest applets/boost util/types.ts (poc-blocks-in-nest)
 */

/** Content tree (Milo-style): preserves DOM structure for safe rendering. */
// eslint-disable-next-line no-unused-vars
export const ContentNode = null; // JSDoc only; structure defined by parse-plain-html.js

/** Parsed text block: rows of content trees. */
// eslint-disable-next-line no-unused-vars
export const TextBlockModel = null;

/** Parsed Adobe TV block: single video link. */
// eslint-disable-next-line no-unused-vars
export const AdobeTvBlockModel = null;

/** Parsed row-card block: image, title, description, optional CTA. */
// eslint-disable-next-line no-unused-vars
export const RowCardBlockModel = null;

/** Parsed block union. */
// eslint-disable-next-line no-unused-vars
export const ParsedBlock = null;

/** Segment: block or raw HTML. */
// eslint-disable-next-line no-unused-vars
export const ParsedSegment = null;
