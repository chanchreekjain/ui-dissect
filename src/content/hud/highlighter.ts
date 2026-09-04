export class Highlighter {
  private box: HTMLElement;

  constructor(shadowRoot: ShadowRoot) {
    this.box = document.createElement('div');
    this.box.id = 'ui-dissect-laser-box';
    this.box.style.position = 'fixed';
    this.box.style.pointerEvents = 'none';
    this.box.style.boxSizing = 'border-box';
    this.box.style.borderRadius = '4px';
    this.box.style.zIndex = '2147483646';
    this.box.style.display = 'none';
    this.box.style.transition = 'all 0.04s ease-out';
    shadowRoot.appendChild(this.box);
  }

  public update(rect: { top: number; left: number; width: number; height: number }, isFrozen: boolean) {
    this.box.style.display = 'block';
    this.box.style.top = `${rect.top}px`;
    this.box.style.left = `${rect.left}px`;
    this.box.style.width = `${rect.width}px`;
    this.box.style.height = `${rect.height}px`;

    if (isFrozen) {
      this.box.style.border = '2px solid #38bdf8';
      this.box.style.background = 'rgba(56, 189, 248, 0.25)';
      this.box.style.boxShadow = '0 0 25px rgba(56, 189, 248, 0.9), inset 0 0 15px rgba(56, 189, 248, 0.3)';
    } else {
      this.box.style.border = '2px solid #6366f1';
      this.box.style.background = 'rgba(99, 102, 241, 0.2)';
      this.box.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.9), inset 0 0 10px rgba(99, 102, 241, 0.25)';
    }
  }

  public hide() {
    this.box.style.display = 'none';
  }
}
