export function extractCssVariables(el: HTMLElement): Record<string, string> {
  const vars: Record<string, string> = {};

  try {
    const comp = window.getComputedStyle(el);

    if (el.style) {
      for (let i = 0; i < el.style.length; i++) {
        const prop = el.style[i];
        if (prop && typeof prop === 'string' && prop.startsWith('--')) {
          const val = el.style.getPropertyValue(prop);
          if (val) vars[prop] = val.trim();
        }
      }
    }

    const commonTokenKeys = [
      '--bg', '--background', '--bg-color',
      '--color', '--text-color',
      '--border', '--border-color',
      '--accent', '--primary', '--glow',
      '--shadow', '--radius', '--blur',
      '--button-primary-bgColor-rest',
      '--button-primary-textColor-rest'
    ];

    for (const key of commonTokenKeys) {
      const raw = comp?.getPropertyValue ? comp.getPropertyValue(key) : '';
      const val = (raw || '').trim();
      if (val && !vars[key]) {
        vars[key] = val;
      }
    }
  } catch {
    // Fail-safe
  }

  return vars;
}
