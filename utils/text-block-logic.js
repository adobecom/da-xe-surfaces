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
 * Text block sizing from class overrides only (e.g. xl-heading, m-body, s-detail).
 * No BLOCK_TYPE_SIZES; sizes come from getTextOverrides(classList) with default 'm' when absent.
 */

/** Override format: class names ending with -heading, -body, -detail (e.g. xl-heading, m-body). */
export default function getTextOverrides(classList) {
    const options = ['-heading', '-body', '-detail', '-title'];
    const overrides = { heading: undefined, body: undefined, detail: undefined, title: undefined };
    Array.from(classList).forEach((cls) => {
        const match = options.find((opt) => cls.endsWith(opt));
        if (!match) {
            return;
        }
        const parts = cls.split('-');
        const type = parts[1]; // heading | body | detail
        const size = parts[0]; // xl | m | s | ...
        if (typeof size !== 'string') {
            return;
        }
        if (type === 'heading') {
            overrides.heading = size;
        } else if (type === 'body') {
            overrides.body = size;
        } else if (type === 'detail') {
            overrides.detail = size;
        } else if (type === 'title') {
            overrides.title = size;
        }
    });
    return overrides;
}
