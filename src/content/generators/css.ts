import type { AestheticStyles, PseudoElementStyles } from '../../types';

export function generateCss(
  className: string,
  styles: AestheticStyles,
  pseudo: { before: PseudoElementStyles | null; after: PseudoElementStyles | null }
): string {
  const lines: string[] = [];

  lines.push(`.${className} {`);

  // Backgrounds & Blurs
  if (styles.backdropFilter) {
    lines.push(`  backdrop-filter: ${styles.backdropFilter};`);
    lines.push(`  -webkit-backdrop-filter: ${styles.backdropFilter};`);
  }
  if (styles.backgroundImage) {
    lines.push(`  background: ${styles.backgroundImage};`);
  } else if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    lines.push(`  background-color: ${styles.backgroundColor};`);
  }

  // Borders & Radii
  if (styles.border.width !== '0px' && styles.border.style !== 'none') {
    lines.push(`  border: ${styles.border.width} ${styles.border.style} ${styles.border.color};`);
  }
  if (styles.border.radius && styles.border.radius !== '0px') {
    lines.push(`  border-radius: ${styles.border.radius};`);
  }

  // Depth & Shadows
  if (styles.boxShadow) {
    lines.push(`  box-shadow: ${styles.boxShadow};`);
  }

  // Typography
  if (styles.typography.color) {
    lines.push(`  color: ${styles.typography.color};`);
  }
  if (styles.typography.fontFamily) {
    lines.push(`  font-family: ${styles.typography.fontFamily};`);
  }
  if (styles.typography.fontSize) {
    lines.push(`  font-size: ${styles.typography.fontSize};`);
  }
  if (styles.typography.fontWeight && styles.typography.fontWeight !== '400') {
    lines.push(`  font-weight: ${styles.typography.fontWeight};`);
  }
  if (styles.typography.letterSpacing && styles.typography.letterSpacing !== '0px') {
    lines.push(`  letter-spacing: ${styles.typography.letterSpacing};`);
  }
  if (styles.typography.textShadow) {
    lines.push(`  text-shadow: ${styles.typography.textShadow};`);
  }

  // Special Effects
  if (styles.clipPath) {
    lines.push(`  clip-path: ${styles.clipPath};`);
  }
  if (styles.mixBlendMode) {
    lines.push(`  mix-blend-mode: ${styles.mixBlendMode};`);
  }
  if (styles.filter) {
    lines.push(`  filter: ${styles.filter};`);
  }
  if (styles.transition) {
    lines.push(`  transition: ${styles.transition};`);
  }

  lines.push('}');

  // Pseudo-elements
  if (pseudo.before) {
    lines.push('');
    lines.push(`.${className}::before {`);
    lines.push(`  content: ${pseudo.before.content};`);
    if (pseudo.before.styles.background) lines.push(`  background: ${pseudo.before.styles.background};`);
    if (pseudo.before.styles.boxShadow) lines.push(`  box-shadow: ${pseudo.before.styles.boxShadow};`);
    if (pseudo.before.styles.clipPath) lines.push(`  clip-path: ${pseudo.before.styles.clipPath};`);
    lines.push('}');
  }

  if (pseudo.after) {
    lines.push('');
    lines.push(`.${className}::after {`);
    lines.push(`  content: ${pseudo.after.content};`);
    if (pseudo.after.styles.background) lines.push(`  background: ${pseudo.after.styles.background};`);
    if (pseudo.after.styles.boxShadow) lines.push(`  box-shadow: ${pseudo.after.styles.boxShadow};`);
    if (pseudo.after.styles.clipPath) lines.push(`  clip-path: ${pseudo.after.styles.clipPath};`);
    lines.push('}');
  }

  return lines.join('\n');
}
