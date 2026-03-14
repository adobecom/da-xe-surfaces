/**
 * Wraps React Spectrum Button and emits CTA click events (analytics + navigation)
 * in the same format as setupCtaClickHandler. Use for any block CTA that should
 * trigger xe-sites-event.
 */
import { useCallback } from 'react';
import { Button } from '@react-spectrum/s2';
import xeSitesContext from '../context/xeSitesContext.js';
import { emitCtaClick } from '../utils/utils.js';

export default function CtaButton({
  href,
  contentId,
  children,
  ...buttonProps
}) {
  const onPress = useCallback(() => {
    const { container } = xeSitesContext;
    if (!container || !href) return;
    emitCtaClick(container, { href, contentId });
  }, [href, contentId]);

  if (!href || href === '#') return null;

  return (
    <Button onPress={onPress} {...buttonProps}>
      {children}
    </Button>
  );
}
