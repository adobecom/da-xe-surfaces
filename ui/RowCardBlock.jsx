/**
 * Row-card block: image, title, description, CTA button.
 * Uses CtaButton wrapper so CTA click emits same events as setupCtaClickHandler.
 */
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Text } from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import { fetchMediaAsBlobUrl } from '../util/fetchMedia.js';
import CtaButton from './CtaButton.jsx';

function getBlockOptions(blockClasses, prefix) {
  const pre = prefix.toLowerCase();
  const result = {};
  (blockClasses || []).forEach((c) => {
    if (c.length <= pre.length || !c.toLowerCase().startsWith(pre)) return;
    const rest = c.slice(pre.length);
    const dash = rest.indexOf('-');
    if (dash < 0) return;
    const key = rest.slice(0, dash);
    const value = rest.slice(dash + 1);
    if (key && value) result[key] = value;
  });
  return result;
}

function getCTAProps(blockClasses) {
  const options = getBlockOptions(blockClasses, 'cta');
  return {
    fillStyle: options?.fillStyle,
    variant: options?.variant,
    size: options?.size?.toUpperCase(),
  };
}

export default function RowCardBlock({ block }) {
  const { image, title, description, cta, blockClasses } = block || {};
  const { fillStyle, variant, size } = getCTAProps(blockClasses) || {};

  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [iconSrc, setIconSrc] = useState(image?.src || '');

  useEffect(() => {
    let cancelled = false;
    let blobUrl = null;
    const src = image?.src;
    if (!src) return () => { };
    fetchMediaAsBlobUrl(src).then((resolved) => {
      if (cancelled) {
        if (resolved?.startsWith?.('blob:')) URL.revokeObjectURL(resolved);
        return;
      }
      if (resolved?.startsWith?.('blob:')) blobUrl = resolved;
      setIconSrc(resolved);
    });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [image?.src]);

  const handleImageLoad = useCallback(() => setIsImageLoaded(true), []);

  useLayoutEffect(() => {
    setIsImageLoaded(false);
  }, [image]);

  return (
    <div
      className={style({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 'lg',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: 16,
        borderColor: 'disabled',
        borderWidth: 1,
        backgroundColor: 'layer-2',
        borderStyle: 'solid',
      })}
    >
      <div
        className={style({
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'start',
          gap: 16,
          flexShrink: 0,
        })}
      >
        <div
          className={style({
            borderRadius: 'sm',
            overflow: 'hidden',
            alignSelf: 'center',
            width: 32,
            height: 32,
          })}
        >
          <img
            onLoad={handleImageLoad}
            onError={handleImageLoad}
            src={iconSrc}
            alt={image.alt ?? title ?? ''}
            className={style({
              transition: 'opacity',
              opacity: {
                default: 0,
                isImageLoaded: 1,
              },
              height: 32,
              width: 32,
            })({ isImageLoaded })}
          />
        </div>
        <div
          className={style({
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          })}
        >
          {title && (
            <div
              className={style({
                font: 'title-lg',
                margin: 0,
              })}
            >
              {title}
            </div>
          )}
          {description && (
            <p
              className={style({
                font: 'body-xs',
                margin: 0,
              })}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      <div
        className={style({ flexShrink: 0 })}
      >
        {cta && (
          <CtaButton
            href={cta.href}
            contentId={cta.contentId}
            {...(fillStyle && { fillStyle })}
            {...(variant && { variant })}
            {...(size && { size })}
            aria-label={cta.ariaLabel}
            UNSAFE_style={{ cursor: 'pointer' }}
          >
            <Text
              styles={style({
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              })}
            >
              {cta.text}
            </Text>
          </CtaButton>
        )}
      </div>
    </div>
  );
}
