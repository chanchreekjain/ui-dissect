import type { AestheticStyles, VisualBorder, TypographyStyles } from '../../types';

export function extractAestheticStyles(el: HTMLElement): AestheticStyles {
  const comp = window.getComputedStyle(el);

  const border: VisualBorder = {
    width: comp.borderWidth || comp.borderTopWidth || '0px',
    style: comp.borderStyle || comp.borderTopStyle || 'none',
    color: comp.borderColor || comp.borderTopColor || '',
    radius: comp.borderRadius || '0px'
  };

  const typography: TypographyStyles = {
    color: comp.color || '',
    fontSize: comp.fontSize || '14px',
    fontWeight: comp.fontWeight || '400',
    fontFamily: comp.fontFamily || 'sans-serif',
    letterSpacing: comp.letterSpacing === 'normal' ? '0px' : (comp.letterSpacing || '0px'),
    lineHeight: comp.lineHeight || 'normal',
    textShadow: comp.textShadow === 'none' ? '' : (comp.textShadow || '')
  };

  const backdropFilter =
    comp.backdropFilter ||
    comp.getPropertyValue?.('-webkit-backdrop-filter') ||
    '';

  return {
    background: comp.background || '',
    backgroundColor: comp.backgroundColor || '',
    backgroundImage: comp.backgroundImage === 'none' ? '' : (comp.backgroundImage || ''),
    backdropFilter: backdropFilter === 'none' ? '' : backdropFilter,
    boxShadow: comp.boxShadow === 'none' ? '' : (comp.boxShadow || ''),
    border,
    typography,
    opacity: comp.opacity === '1' ? '' : (comp.opacity || ''),
    filter: comp.filter === 'none' ? '' : (comp.filter || ''),
    mixBlendMode: comp.mixBlendMode === 'normal' ? '' : (comp.mixBlendMode || ''),
    clipPath: comp.clipPath === 'none' ? '' : (comp.clipPath || ''),
    transition: comp.transition === 'all 0s ease 0s' ? '' : (comp.transition || ''),
    transform: comp.transform === 'none' ? '' : (comp.transform || '')
  };
}
