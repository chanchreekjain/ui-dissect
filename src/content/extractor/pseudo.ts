import type { PseudoElementStyles } from '../../types';

function extractPseudo(el: HTMLElement, pseudoName: '::before' | '::after'): PseudoElementStyles | null {
  const comp = window.getComputedStyle(el, pseudoName);
  const content = comp.getPropertyValue('content');

  // If pseudo element is not rendered or inactive
  if (!content || content === 'none' || content === 'normal' || comp.display === 'none') {
    return null;
  }

  const bg = comp.background;
  const bgImg = comp.backgroundImage;
  const shadow = comp.boxShadow;
  const border = comp.border;
  const filter = comp.filter;

  // Has meaningful aesthetic contribution
  const hasVisuals =
    (bgImg && bgImg !== 'none') ||
    (shadow && shadow !== 'none') ||
    (border && !border.includes('0px')) ||
    (filter && filter !== 'none');

  if (!hasVisuals && comp.width === '0px' && comp.height === '0px') {
    return null;
  }

  return {
    content,
    styles: {
      background: bg,
      backgroundImage: bgImg === 'none' ? '' : bgImg,
      boxShadow: shadow === 'none' ? '' : shadow,
      backdropFilter: comp.backdropFilter === 'none' ? '' : comp.backdropFilter,
      filter: filter === 'none' ? '' : filter,
      opacity: comp.opacity === '1' ? '' : comp.opacity,
      clipPath: comp.clipPath === 'none' ? '' : comp.clipPath
    }
  };
}

export function extractPseudoElements(el: HTMLElement) {
  return {
    before: extractPseudo(el, '::before'),
    after: extractPseudo(el, '::after')
  };
}
