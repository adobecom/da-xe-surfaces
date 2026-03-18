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
 * Fetch media with retry on 425/503. Returns blob URL for img src.
 * Reference: nest applets/boost util/fetchMedia.ts (poc-blocks-in-nest)
 */
const RETRY_STATUSES = [425, 503];
const RETRY_DELAY_MS = 1500;
const RETRY_MAX_ATTEMPTS = 3;

async function fetchWithRetry(url, opts = {}) {
  const {
    resolveUrl,
    maxAttempts = RETRY_MAX_ATTEMPTS,
    retryStatuses = RETRY_STATUSES,
    delayMs = RETRY_DELAY_MS,
  } = opts;
  const fetchUrl = resolveUrl ? resolveUrl(url) : url;
  let lastResponse;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(fetchUrl, { cache: 'default' });
    lastResponse = response;
    if (response.ok || !retryStatuses.includes(response.status)) {
      return response;
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => { setTimeout(r, delayMs); });
    }
  }
  return lastResponse;
}

/**
 * Fetch media URL with retry; return blob URL for img src.
 * Caller should revoke blob URL when no longer needed.
 */
export async function fetchMediaAsBlobUrl(url, opts = {}) {
  if (!url || url.startsWith('data:')) {
    return url;
  }
  try {
    const response = await fetchWithRetry(url, opts);
    if (!response.ok) return url;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return url;
  }
}
