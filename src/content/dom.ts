export const UI_DISSECT_HOST_ID = 'ui-dissect-host';

/**
 * Checks if a given node or element belongs to UI Dissect's own shadow/host UI
 */
export function isDissectElement(node: Node | null): boolean {
  if (!node) return false;
  if (node instanceof HTMLElement && node.id === UI_DISSECT_HOST_ID) return true;
  if (node.parentElement && isDissectElement(node.parentElement)) return true;
  const root = node.getRootNode();
  if (root instanceof ShadowRoot && root.host?.id === UI_DISSECT_HOST_ID) return true;
  return false;
}

/**
 * Pierces open shadow boundaries to find the deepest rendered HTMLElement at (x, y)
 */
export function deepElementFromPoint(x: number, y: number): HTMLElement | null {
  let el = document.elementFromPoint(x, y);
  if (!el || isDissectElement(el)) return null;

  while (el && el.shadowRoot) {
    const nested = el.shadowRoot.elementFromPoint(x, y);
    if (!nested || nested === el || isDissectElement(nested)) break;
    el = nested;
  }

  return el instanceof HTMLElement ? el : null;
}
