/**
 * Scans stylesheets and inline declarations to discover relevant CSS custom properties
 */
export function extractCssVariables(el: HTMLElement): Record<string, string> {
  const comp = window.getComputedStyle(el);
  const vars: Record<string, string> = {};

  // Check inline styles first
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style[i];
    if (prop.startsWith('--')) {
      vars[prop] = el.style.getPropertyValue(prop).trim();
    }
  }

  // Probe common design token variable names on element
  const commonTokenKeys = [
    '--bg', '--background', '--bg-color',
    '--color', '--text-color',
    '--border', '--border-color',
    '--accent', '--primary', '--glow',
    '--shadow', '--radius', '--blur'
  ];

  for (const key of commonTokenKeys) {
    const val = comp.getPropertyValue(key).trim();
    if (val && !vars[key]) {
      vars[key] = val;
    }
  }

  return vars;
}
