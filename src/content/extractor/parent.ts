/**
 * Walks up the DOM tree to identify the effective backdrop behind the element
 */
export function extractParentBackdrop(el: HTMLElement): string {
  let current: HTMLElement | null = el.parentElement;

  while (current && current !== document.documentElement) {
    const comp = window.getComputedStyle(current);
    const bg = comp.backgroundColor;
    const bgImg = comp.backgroundImage;

    if (bgImg && bgImg !== 'none') {
      return bgImg;
    }

    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }

    current = current.parentElement;
  }

  return '#0a0d14'; // Default dark fallback
}
