import type { AestheticClassification, AestheticStyles, PseudoElementStyles } from '../types';

export function classifyAesthetic(
  styles: AestheticStyles,
  pseudo: { before: PseudoElementStyles | null; after: PseudoElementStyles | null }
): AestheticClassification {
  const traits: string[] = [];

  // 1. Glassmorphism Detection
  const hasBackdropBlur = Boolean(styles.backdropFilter && styles.backdropFilter.includes('blur'));
  const isTranslucentBg = styles.backgroundColor.includes('rgba') && !styles.backgroundColor.includes(', 1)');
  const hasSubtleBorder = styles.border.width !== '0px' && styles.border.color.includes('rgba');

  if (hasBackdropBlur || (isTranslucentBg && hasSubtleBorder)) {
    if (hasBackdropBlur) traits.push('Backdrop Blur');
    if (isTranslucentBg) traits.push('Translucent Glass Fill');
    if (hasSubtleBorder) traits.push('Specular Rim Border');
    if (styles.boxShadow) traits.push('Diffused Depth Shadow');

    return {
      category: 'glassmorphism',
      title: '✦ Glassmorphism',
      confidence: hasBackdropBlur ? 0.95 : 0.8,
      traits
    };
  }

  // 2. Cyberpunk / Mission-Control HUD Detection
  const isMonospace = /mono|code|consolas|fira|jetbrains/i.test(styles.typography.fontFamily);
  const hasNeonGlow =
    /rgba?\(\s*(?:0|5[0-9]|1[0-9]{2}|255)\s*,\s*(?:255|200)\s*,\s*(?:255|100)/i.test(styles.boxShadow || '') ||
    /rgba?\(\s*(?:0|5[0-9]|1[0-9]{2}|255)\s*,\s*(?:255|200)\s*,\s*(?:255|100)/i.test(styles.typography.textShadow || '');
  const hasClipPath = Boolean(styles.clipPath);
  const hasHudPseudo = Boolean(pseudo.before?.styles.boxShadow || pseudo.after?.styles.boxShadow || pseudo.before?.styles.clipPath);

  if (hasNeonGlow || (isMonospace && (hasClipPath || hasHudPseudo))) {
    if (hasNeonGlow) traits.push('Photonic Neon Glow');
    if (hasClipPath) traits.push('Chamfered Polygon Clip');
    if (isMonospace) traits.push('Technical Monospace');
    if (hasHudPseudo) traits.push('HUD Grid/Bracket Accents');

    return {
      category: 'cyberpunk-hud',
      title: '✦ Mission-Control HUD',
      confidence: 0.92,
      traits
    };
  }

  // 3. Radiant Dark Glow Detection
  const hasAmbientGlow = styles.boxShadow && /rgba?\([^)]+\)\s+(?:0px\s+){1,2}[1-9]/.test(styles.boxShadow);
  if (hasAmbientGlow) {
    traits.push('Radial Aura Glow');
    if (styles.border.width !== '0px') traits.push('Accent Border');
    return {
      category: 'dark-glow',
      title: '✦ Radiant Dark Glow',
      confidence: 0.85,
      traits
    };
  }

  // 4. Neumorphism Detection
  const hasDualShadow = styles.boxShadow && styles.boxShadow.includes(',') &&
    (styles.boxShadow.includes('inset') || styles.boxShadow.includes('-'));
  if (hasDualShadow) {
    traits.push('Bi-directional Shadow');
    traits.push('Surface Emboss');
    return {
      category: 'neumorphism',
      title: '✦ Neumorphic Soft UI',
      confidence: 0.8,
      traits
    };
  }

  // 5. Gradient Mesh
  if (styles.backgroundImage.includes('gradient')) {
    traits.push('Multi-stop Gradient');
    return {
      category: 'gradient-mesh',
      title: '✦ Gradient Mesh Flow',
      confidence: 0.85,
      traits
    };
  }

  // 6. Minimalist Modern
  traits.push('Precision Typography');
  if (styles.border.width !== '0px') traits.push('Hairline Border');
  return {
    category: 'minimalist-flat',
    title: '✦ Minimalist Modern',
    confidence: 0.7,
    traits
  };
}
