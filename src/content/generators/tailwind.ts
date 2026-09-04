import type { AestheticStyles } from '../../types';

function cleanVal(v: string): string {
  return v.replace(/\s+/g, '_');
}

export function generateTailwind(styles: AestheticStyles): string {
  const classes: string[] = [];

  // Backdrop filter
  if (styles.backdropFilter) {
    const blurMatch = styles.backdropFilter.match(/blur\((\d+px)\)/);
    if (blurMatch) {
      classes.push(`backdrop-blur-[${blurMatch[1]}]`);
    } else {
      classes.push(`backdrop-blur-md`);
    }
  }

  // Background
  if (styles.backgroundImage) {
    classes.push(`bg-[${cleanVal(styles.backgroundImage)}]`);
  } else if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    classes.push(`bg-[${cleanVal(styles.backgroundColor)}]`);
  }

  // Border
  if (styles.border.width !== '0px' && styles.border.style !== 'none') {
    classes.push(`border`);
    classes.push(`border-[${cleanVal(styles.border.color)}]`);
  }
  if (styles.border.radius && styles.border.radius !== '0px') {
    classes.push(`rounded-[${styles.border.radius}]`);
  }

  // Box Shadow
  if (styles.boxShadow) {
    classes.push(`shadow-[${cleanVal(styles.boxShadow)}]`);
  }

  // Typography
  if (styles.typography.color) {
    classes.push(`text-[${cleanVal(styles.typography.color)}]`);
  }
  if (styles.typography.fontSize) {
    classes.push(`text-[${styles.typography.fontSize}]`);
  }
  if (styles.typography.fontWeight && styles.typography.fontWeight !== '400') {
    classes.push(`font-[${styles.typography.fontWeight}]`);
  }
  if (styles.typography.letterSpacing && styles.typography.letterSpacing !== '0px') {
    classes.push(`tracking-[${styles.typography.letterSpacing}]`);
  }

  return classes.join(' ');
}
