import type { DissectedComponent } from '../../types';
import { UI_DISSECT_HOST_ID } from '../dom';
import { Highlighter } from './highlighter';

export class DissectHUD {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private highlighter: Highlighter;
  private hudPanel: HTMLElement;
  private statusBar: HTMLElement;
  private currentComponent: DissectedComponent | null = null;
  private currentFormat: 'tailwind' | 'css' | 'react' | 'tokens' = 'tailwind';

  constructor() {
    const existing = document.getElementById(UI_DISSECT_HOST_ID);
    if (existing) existing.remove();

    this.host = document.createElement('div');
    this.host.id = UI_DISSECT_HOST_ID;
    this.host.style.position = 'fixed';
    this.host.style.top = '0';
    this.host.style.left = '0';
    this.host.style.width = '0';
    this.host.style.height = '0';
    this.host.style.pointerEvents = 'none';
    this.host.style.zIndex = '2147483647';

    this.shadow = this.host.attachShadow({ mode: 'open' });
    document.documentElement.appendChild(this.host);

    this.injectStyles();
    this.highlighter = new Highlighter(this.shadow);

    // Top status indicator
    this.statusBar = document.createElement('div');
    this.statusBar.className = 'dissect-status-bar';
    this.statusBar.innerHTML = `
      <span class="status-dot"></span>
      <span><strong>UI Dissect Active</strong> &mdash; Hover any element, press <kbd>Space</kbd> to freeze</span>
    `;
    this.shadow.appendChild(this.statusBar);

    // Floating Code & Inspection HUD
    this.hudPanel = document.createElement('div');
    this.hudPanel.className = 'dissect-hud-panel';
    this.shadow.appendChild(this.hudPanel);

    this.hudPanel.style.display = 'none';
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        z-index: 2147483647;
      }
      .dissect-status-bar {
        position: fixed;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(10, 14, 23, 0.9);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(99, 102, 241, 0.4);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 15px rgba(99, 102, 241, 0.2);
        color: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        padding: 6px 14px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: none;
        z-index: 2147483647;
      }
      .status-dot {
        width: 8px;
        height: 8px;
        background: #22c55e;
        border-radius: 50%;
        box-shadow: 0 0 8px #22c55e;
      }
      .dissect-highlight-box {
        position: fixed;
        pointer-events: none;
        box-sizing: border-box;
        border: 2px solid #6366f1;
        background: rgba(99, 102, 241, 0.12);
        box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
        border-radius: 4px;
        transition: all 0.05s ease-out;
        z-index: 2147483646;
      }
      .dissect-highlight-box.frozen {
        border-color: #38bdf8;
        background: rgba(56, 189, 248, 0.16);
        box-shadow: 0 0 25px rgba(56, 189, 248, 0.7);
      }
      .dissect-hud-panel {
        position: fixed;
        pointer-events: auto;
        width: 360px;
        background: rgba(10, 14, 23, 0.96);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
        color: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 14px;
        z-index: 2147483647;
        box-sizing: border-box;
      }
      .hud-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .hud-tag {
        font-size: 11px;
        font-weight: 700;
        color: #a5b4fc;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }
      .hud-badge {
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 999px;
        background: rgba(99, 102, 241, 0.15);
        border: 1px solid #6366f1;
        color: #c7d2fe;
        font-weight: 600;
      }
      .hud-badge.frozen {
        background: rgba(56, 189, 248, 0.15);
        border-color: #38bdf8;
        color: #7dd3fc;
      }
      .hud-traits {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 10px;
      }
      .trait-pill {
        font-size: 10px;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 4px;
        color: #94a3b8;
      }
      .hud-tabs {
        display: flex;
        gap: 4px;
        background: rgba(255, 255, 255, 0.04);
        padding: 3px;
        border-radius: 8px;
        margin-bottom: 8px;
      }
      .hud-tab {
        flex: 1;
        padding: 5px 0;
        font-size: 11px;
        font-weight: 600;
        text-align: center;
        border-radius: 6px;
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .hud-tab.active {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      .hud-code-box {
        background: #060910;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 10px;
        font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
        font-size: 11px;
        max-height: 140px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-all;
        color: #38bdf8;
      }
      .hud-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
        font-size: 10px;
        color: #64748b;
      }
      .copy-btn {
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .copy-btn:hover {
        background: #4f46e5;
      }
      kbd {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        padding: 1px 4px;
        color: #cbd5e1;
        font-family: monospace;
      }
    `;
    this.shadow.appendChild(style);
  }

  public render(comp: DissectedComponent, isFrozen: boolean) {
    this.currentComponent = comp;
    this.highlighter.update(comp.rect as DOMRect, isFrozen);

    // Only display full code HUD when frozen or explicitly requested
    if (!isFrozen) {
      this.hudPanel.style.display = 'none';
      return;
    }

    let codeDisplay = '';
    if (this.currentFormat === 'tailwind') codeDisplay = comp.code.tailwind;
    else if (this.currentFormat === 'css') codeDisplay = comp.code.css;
    else if (this.currentFormat === 'react') codeDisplay = comp.code.react;
    else if (this.currentFormat === 'tokens') {
      codeDisplay = Object.entries(comp.code.tokens)
        .map(([k, v]) => `${k}: ${v};`)
        .join('\n') || '/* No custom variables found */';
    }

    const traitsHtml = comp.classification.traits
      .map((t) => `<span class="trait-pill">${t}</span>`)
      .join('');

    this.hudPanel.innerHTML = `
      <div class="hud-header">
        <span class="hud-tag">&lt;${comp.tagName.toLowerCase()}&gt;</span>
        <span class="hud-badge frozen">❄ ${comp.classification.title}</span>
      </div>
      <div class="hud-traits">${traitsHtml}</div>
      <div class="hud-tabs">
        <button class="hud-tab ${this.currentFormat === 'tailwind' ? 'active' : ''}" data-fmt="tailwind">Tailwind</button>
        <button class="hud-tab ${this.currentFormat === 'css' ? 'active' : ''}" data-fmt="css">CSS</button>
        <button class="hud-tab ${this.currentFormat === 'react' ? 'active' : ''}" data-fmt="react">React</button>
        <button class="hud-tab ${this.currentFormat === 'tokens' ? 'active' : ''}" data-fmt="tokens">Tokens</button>
      </div>
      <div class="hud-code-box">${escapeHtml(codeDisplay)}</div>
      <div class="hud-footer">
        <span><kbd>Space</kbd> Unfreeze | <kbd>&uarr;/&darr;</kbd> Layer</span>
        <button class="copy-btn" id="hudCopyBtn">Copy Code</button>
      </div>
    `;

    this.hudPanel.querySelectorAll<HTMLButtonElement>('.hud-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        this.currentFormat = tab.dataset.fmt as any;
        this.render(comp, isFrozen);
      });
    });

    const copyBtn = this.hudPanel.querySelector<HTMLButtonElement>('#hudCopyBtn');
    copyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyCurrentCode();
    });

    this.positionPanel(comp.rect as DOMRect);
    this.hudPanel.style.display = 'block';
  }

  public copyCurrentCode() {
    if (!this.currentComponent) return;
    let text = '';
    if (this.currentFormat === 'tailwind') text = this.currentComponent.code.tailwind;
    else if (this.currentFormat === 'css') text = this.currentComponent.code.css;
    else if (this.currentFormat === 'react') text = this.currentComponent.code.react;
    else if (this.currentFormat === 'tokens') {
      text = Object.entries(this.currentComponent.code.tokens)
        .map(([k, v]) => `${k}: ${v};`)
        .join('\n');
    }

    navigator.clipboard.writeText(text);
    const copyBtn = this.hudPanel.querySelector<HTMLButtonElement>('#hudCopyBtn');
    if (copyBtn) {
      copyBtn.textContent = 'Copied! ✓';
      setTimeout(() => {
        if (copyBtn) copyBtn.textContent = 'Copy Code';
      }, 1200);
    }
  }

  private positionPanel(rect: DOMRect) {
    const pad = 14;
    const panelWidth = 360;
    const panelHeight = 260;

    let left = rect.left;
    if (left + panelWidth > window.innerWidth - pad) {
      left = window.innerWidth - panelWidth - pad;
    }
    if (left < pad) left = pad;

    let top = rect.bottom + pad;
    if (top + panelHeight > window.innerHeight - pad) {
      top = rect.top - panelHeight - pad;
    }
    if (top < pad) top = pad;

    this.hudPanel.style.top = `${top}px`;
    this.hudPanel.style.left = `${left}px`;
  }

  public hide() {
    this.highlighter.hide();
    this.hudPanel.style.display = 'none';
  }

  public destroy() {
    this.host.remove();
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
