import type { DissectedComponent, InspectorState } from '../types';
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
  private rafId: number | null = null;

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
    if (!this.active || !this.currentElement) return;
    const isFrozen = this.freezer.toggle();
    this.dissect(this.currentElement, isFrozen);
    this.notifyState();
  }

  public navigateUp(): void {
    if (!this.active || this.hierarchyStack.length <= 1) return;
    if (this.hierarchyIndex < this.hierarchyStack.length - 1) {
      this.hierarchyIndex++;
      const el = this.hierarchyStack[this.hierarchyIndex];
      this.currentElement = el;
      this.dissect(el, this.freezer.isFrozen());
    }
  }

  public navigateDown(): void {
    if (!this.active || this.hierarchyStack.length <= 1) return;
    if (this.hierarchyIndex > 0) {
      this.hierarchyIndex--;
      const el = this.hierarchyStack[this.hierarchyIndex];
      this.currentElement = el;
      this.dissect(el, this.freezer.isFrozen());
    }
  }

  public copyCurrentCode(): void {
    this.hud?.copyCurrentCode();
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.active || this.freezer.isFrozen()) return;

    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      try {
        const path = e.composedPath ? e.composedPath() : [];
        let target: HTMLElement | null = null;

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
        this.buildHierarchy(target);
        this.dissect(target, false);
      } catch (err) {
        console.error('[UI Dissect] Mouse hover error:', err);
      }
    });
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
      const styles = extractAestheticStyles(el);
      const pseudo = extractPseudoElements(el);
      const parentBg = extractParentBackdrop(el);
      const tokens = extractCssVariables(el);
      const classification = classifyAesthetic(styles, pseudo);

      const className = el.className && typeof el.className === 'string'
        ? el.className.trim().split(/\s+/)[0] || 'dissected-component'
        : 'dissected-component';

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
          css: generateCss(className, styles, pseudo),
          tailwind: generateTailwind(styles),
          react: '',
          tokens
        }
      };

      component.code.react = generateReactComponent(component);
      this.hud?.render(component, isFrozen);
    } catch (err) {
      console.error('[UI Dissect] Dissect error:', err);
    }
  }

  private bindEvents() {
    window.addEventListener('mousemove', this.handleMouseMove, true);
  }

  private unbindEvents() {
    window.removeEventListener('mousemove', this.handleMouseMove, true);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private notifyState() {
    chrome.runtime.sendMessage({
      type: 'STATE_CHANGED',
      state: this.getState()
    }).catch(() => {});
  }
}
