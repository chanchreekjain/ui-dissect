import type { AestheticStyles } from '../../types';

function cleanVal(v: string | undefined | null): string {
  if (!v) return '';
  return v.replace(/\s+/g, '_');
}

export function generateTailwind(styles: AestheticStyles): string {
  const classes: string[] = [];

  if (styles.backdropFilter) {
    const blurMatch = styles.backdropFilter.match(/blur\((\d+px)\)/);
    classes.push(blurMatch ? `backdrop-blur-[${blurMatch[1]}]` : `backdrop-blur-md`);
  }

  if (styles.backgroundImage) {
    classes.push(`bg-[${cleanVal(styles.backgroundImage)}]`);
  } else if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    classes.push(`bg-[${cleanVal(styles.backgroundColor)}]`);
  }

  if (styles.border?.width && styles.border.width !== '0px' && styles.border.style !== 'none') {
    classes.push(`border`);
    if (styles.border.color) {
      classes.push(`border-[${cleanVal(styles.border.color)}]`);
    }
  }
  if (styles.border?.radius && styles.border.radius !== '0px') {
    classes.push(`rounded-[${styles.border.radius}]`);
  }

  if (styles.boxShadow) {
    classes.push(`shadow-[${cleanVal(styles.boxShadow)}]`);
  }

  if (styles.typography?.color) {
    classes.push(`text-[${cleanVal(styles.typography.color)}]`);
  }
  if (styles.typography?.fontSize) {
    classes.push(`text-[${styles.typography.fontSize}]`);
  }
  if (styles.typography?.fontWeight && styles.typography.fontWeight !== '400') {
    classes.push(`font-[${styles.typography.fontWeight}]`);
  }
  if (styles.typography?.letterSpacing && styles.typography.letterSpacing !== '0px') {
    classes.push(`tracking-[${styles.typography.letterSpacing}]`);
  }

  return classes.filter(Boolean).join(' ');
}
