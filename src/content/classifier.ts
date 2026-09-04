import type { AestheticClassification, AestheticStyles, PseudoElementStyles } from '../types';

export function classifyAesthetic(
  styles: AestheticStyles,
  pseudo: { before: PseudoElementStyles | null; after: PseudoElementStyles | null }
): AestheticClassification {
  const traits: string[] = [];

  const backdrop = styles.backdropFilter || '';
  const bgCol = styles.backgroundColor || '';
  const bgImg = styles.backgroundImage || '';
  const bColor = styles.border?.color || '';
  const bWidth = styles.border?.width || '0px';
  const shadow = styles.boxShadow || '';
  const font = styles.typography?.fontFamily || '';
  const tShadow = styles.typography?.textShadow || '';

  // 1. Glassmorphism Detection
  const hasBackdropBlur = backdrop.includes('blur');
  const isTranslucentBg = bgCol.includes('rgba') && !bgCol.includes(', 1)');
  const hasSubtleBorder = bWidth !== '0px' && bColor.includes('rgba');

  if (hasBackdropBlur || (isTranslucentBg && hasSubtleBorder)) {
    if (hasBackdropBlur) traits.push('Backdrop Blur');
    if (isTranslucentBg) traits.push('Translucent Glass Fill');
    if (hasSubtleBorder) traits.push('Specular Rim Border');
    if (shadow) traits.push('Diffused Depth Shadow');

    return {
      category: 'glassmorphism',
      title: '✦ Glassmorphism',
      confidence: hasBackdropBlur ? 0.95 : 0.8,
      traits
    };
  }

  // 2. Cyberpunk / Mission-Control HUD Detection
  const isMonospace = /mono|code|consolas|fira|jetbrains/i.test(font);
  const hasNeonGlow =
    /rgba?\(\s*(?:0|5[0-9]|1[0-9]{2}|255)\s*,\s*(?:255|200)\s*,\s*(?:255|100)/i.test(shadow) ||
    /rgba?\(\s*(?:0|5[0-9]|1[0-9]{2}|255)\s*,\s*(?:255|200)\s*,\s*(?:255|100)/i.test(tShadow);
  const hasClipPath = Boolean(styles.clipPath);
  const hasHudPseudo = Boolean(pseudo.before?.styles?.boxShadow || pseudo.after?.styles?.boxShadow || pseudo.before?.styles?.clipPath);

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
  const hasAmbientGlow = shadow && /rgba?\([^)]+\)\s+(?:0px\s+){1,2}[1-9]/.test(shadow);
  if (hasAmbientGlow) {
    traits.push('Radial Aura Glow');
    if (bWidth !== '0px') traits.push('Accent Border');
    return {
      category: 'dark-glow',
      title: '✦ Radiant Dark Glow',
      confidence: 0.85,
      traits
    };
  }

  // 4. Neumorphism Detection
  const hasDualShadow = shadow && shadow.includes(',') &&
    (shadow.includes('inset') || shadow.includes('-'));
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
  if (bgImg.includes('gradient')) {
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
  if (bWidth !== '0px') traits.push('Hairline Border');
  return {
    category: 'minimalist-flat',
    title: '✦ Minimalist Modern',
    confidence: 0.7,
    traits
  };
}
