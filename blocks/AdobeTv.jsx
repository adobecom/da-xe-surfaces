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
 * Adobe TV block: iframe for video.tv.adobe.com or .mp4.
 * Sends video play analytics via boost-event.
 */
import { useEffect, useRef } from 'react';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import boostContext from '../context/boostContext.js';

const ADOBE_TV_ORIGIN = 'https://video.tv.adobe.com';

function sendVideoPlayAnalytics(block) {
  const { container, dispatchEvent } = boostContext;
  if (dispatchEvent && container) {
    dispatchEvent(container, {
      type: 'analytics',
      subType: 'track',
      data: { eventType: 'click', subtype: 'video', contentAction: block?.videoHref },
    });
  }
}

export default function AdobeTvBlock({ block }) {
  const iframeRef = useRef(null);
  const lastStateRef = useRef(null);
  const hasSentPlayAnalytics = useRef(false);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== ADOBE_TV_ORIGIN || !event.data) return;
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;

      const { state, id } = event.data;
      const isPlayState = state === 'play' || state === 'playing';
      const isPauseState = state === 'pause' || state === 'paused';
      const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
      const idOk = id == null
        || (Number.isInteger(idNum) && iframe.src.startsWith(`${event.origin}/v/${idNum}`));

      if (isPlayState && idOk) {
        const wasPlaying = lastStateRef.current === 'play' || lastStateRef.current === 'playing';
        if (!wasPlaying && !hasSentPlayAnalytics.current) {
          sendVideoPlayAnalytics(block);
          hasSentPlayAnalytics.current = true;
        }
        lastStateRef.current = 'play';
      } else if (isPauseState) {
        lastStateRef.current = 'pause';
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [block]);

  return (
    <div
      className={style({
        display: 'flex',
        flexDirection: 'column',
        // maxWidth: 720,
      })}
    >
      <iframe
        ref={iframeRef}
        src={block.videoHref}
        title='Adobe Video Publishing Cloud Player'
        className={style({
          borderWidth: 0,
          borderRadius: 'xl',
          width: 'full',
          aspectRatio: 'video',
          // maxHeight: 400,
        })}
        allow='encrypted-media; fullscreen'
        loading='lazy'
      />
    </div>
  );
}
