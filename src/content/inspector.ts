import type { DissectedComponent, InspectorState, AestheticStyles, AestheticClassification } from '../types';
import { isDissectElement } from './dom';
import { extractAestheticStyles } from './extractor/computed';
import { extractCssVariables } from './extractor/variables';
import { extractPseudoElements } from './extractor/pseudo';
import { extractParentBackdrop } from './extractor/parent';
import { classifyAesthetic } from './classifier';
import { generateCss } from './generators/css';
import { generateTailwind } from './generators/tailwind';
import { generateReactComponent } from './generators/react';
import { DissectHUD } from './hud';
import { StateFreezer } from './freezer';

export class DOMInspector {
  private active = false;
  private freezer = new StateFreezer();
  private hud: DissectHUD | null = null;
  private currentElement: HTMLElement | null = null;
  private hierarchyStack: HTMLElement[] = [];
  private hierarchyIndex = 0;

  public isActive(): boolean {
    return this.active;
  }

  public getState(): InspectorState {
    return {
      isActive: this.active,
      isFrozen: this.freezer.isFrozen(),
      hasTarget: this.currentElement !== null
    };
  }

  public start(): void {
    if (this.active) return;
    this.active = true;
    this.hud = new DissectHUD();
    this.bindEvents();
    this.notifyState();
  }

  public stop(): void {
    if (!this.active) return;
    this.active = false;
    this.freezer.unfreeze();
    this.unbindEvents();
    this.hud?.destroy();
    this.hud = null;
    this.currentElement = null;
    this.hierarchyStack = [];
    this.notifyState();
  }

  public toggle(): void {
    if (this.active) this.stop();
    else this.start();
  }

  public toggleFreeze(): void {
    if (!this.active) return;
    if (!this.currentElement) {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      if (el instanceof HTMLElement && !isDissectElement(el)) {
        this.currentElement = el;
      } else {
        return;
      }
    }
    const isFrozen = this.freezer.toggle();
    const rect = this.currentElement.getBoundingClientRect();
    this.hud?.updateHighlight(rect, isFrozen);
    this.dissect(this.currentElement, isFrozen);
    this.notifyState();
  }

  public navigateUp(): void {
    if (!this.active || this.hierarchyStack.length <= 1) return;
    if (this.hierarchyIndex < this.hierarchyStack.length - 1) {
      this.hierarchyIndex++;
      const el = this.hierarchyStack[this.hierarchyIndex];
      this.currentElement = el;
      const rect = el.getBoundingClientRect();
      this.hud?.updateHighlight(rect, this.freezer.isFrozen());
      this.dissect(el, this.freezer.isFrozen());
    }
  }

  public navigateDown(): void {
    if (!this.active || this.hierarchyStack.length <= 1) return;
    if (this.hierarchyIndex > 0) {
      this.hierarchyIndex--;
      const el = this.hierarchyStack[this.hierarchyIndex];
      this.currentElement = el;
      const rect = el.getBoundingClientRect();
      this.hud?.updateHighlight(rect, this.freezer.isFrozen());
      this.dissect(el, this.freezer.isFrozen());
    }
  }

  public copyCurrentCode(): void {
    this.hud?.copyCurrentCode();
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.active || this.freezer.isFrozen()) return;

    let target: HTMLElement | null = null;
    const path = e.composedPath ? e.composedPath() : [];

    for (const node of path) {
      if (node instanceof HTMLElement) {
        if (isDissectElement(node)) {
          return;
        }
        if (node !== document.body && node !== document.documentElement) {
          target = node;
          break;
        }
      }
    }

    if (!target && e.target instanceof HTMLElement) {
      if (!isDissectElement(e.target) && e.target !== document.body && e.target !== document.documentElement) {
        target = e.target;
      }
    }

    if (!target || target === this.currentElement) {
      return;
    }

    this.currentElement = target;

    const rect = target.getBoundingClientRect();
    this.hud?.updateHighlight(rect, false);

    this.buildHierarchy(target);
    this.dissect(target, false);
  };

  private buildHierarchy(el: HTMLElement) {
    this.hierarchyStack = [];
    let curr: HTMLElement | null = el;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      if (!isDissectElement(curr)) {
        this.hierarchyStack.push(curr);
      }
      curr = curr.parentElement;
    }
    this.hierarchyIndex = 0;
  }

  private dissect(el: HTMLElement, isFrozen: boolean) {
    try {
      const rect = el.getBoundingClientRect();
      
      let styles: AestheticStyles;
      try {
        styles = extractAestheticStyles(el);
      } catch (e) {
        console.warn('[UI Dissect] extractAestheticStyles error:', e);
        styles = {} as any;
      }

      let pseudo = { before: null, after: null };
      try {
        pseudo = extractPseudoElements(el);
      } catch (e) {
        console.warn('[UI Dissect] extractPseudoElements error:', e);
      }

      let parentBg = '#0a0d14';
      try {
        parentBg = extractParentBackdrop(el);
      } catch (e) {
        console.warn('[UI Dissect] extractParentBackdrop error:', e);
      }

      let tokens: Record<string, string> = {};
      try {
        tokens = extractCssVariables(el);
      } catch (e) {
        console.warn('[UI Dissect] extractCssVariables error:', e);
      }

      let classification: AestheticClassification;
      try {
        classification = classifyAesthetic(styles, pseudo);
      } catch (e) {
        console.warn('[UI Dissect] classifyAesthetic error:', e);
        classification = {
          category: 'minimalist-flat',
          title: '✦ Modern Component',
          confidence: 0.8,
          traits: ['Clean Layout', 'Direct Styling']
        };
      }

      const className = el.className && typeof el.className === 'string'
        ? el.className.trim().split(/\s+/)[0] || 'dissected-component'
        : 'dissected-component';

      let cssCode = '';
      try {
        cssCode = generateCss(className, styles, pseudo);
      } catch (e) {
        console.warn('[UI Dissect] generateCss error:', e);
        const comp = window.getComputedStyle(el);
        cssCode = `.${className} {\n  background: ${comp.backgroundColor};\n  color:${comp.color};\n  border-radius: ${comp.borderRadius};\n  box-shadow:${comp.boxShadow};\n}`;
      }

      let twCode = '';
      try {
        twCode = generateTailwind(styles);
      } catch (e) {
        console.warn('[UI Dissect] generateTailwind error:', e);
        twCode = '/* Tailwind utility generation error */';
      }

      const component: DissectedComponent = {
        tagName: el.tagName || 'DIV',
        id: el.id || null,
        classList: el.classList ? Array.from(el.classList) : [],
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        classification,
        styles,
        pseudo,
        parentBackground: parentBg,
        code: {
          css: cssCode,
          tailwind: twCode,
          react: '',
          tokens
        }
      };

      try {
        component.code.react = generateReactComponent(component);
      } catch (e) {
        console.warn('[UI Dissect] generateReactComponent error:', e);
        component.code.react = `// React Component\nexport function ${className}() {\n  return <div className="${twCode}">...</div>;\n}`;
      }

      this.hud?.render(component, isFrozen);
    } catch (err: any) {
      console.error('[UI Dissect] Dissect error:', err);
      if (isFrozen) {
        this.hud?.renderFallback(el, err);
      }
    }
  }

  private bindEvents() {
    window.addEventListener('mousemove', this.handleMouseMove, true);
  }

  private unbindEvents() {
    window.removeEventListener('mousemove', this.handleMouseMove, true);
  }

  private notifyState() {
    chrome.runtime.sendMessage({
      type: 'STATE_CHANGED',
      state: this.getState()
    }).catch(() => {});
  }
}
