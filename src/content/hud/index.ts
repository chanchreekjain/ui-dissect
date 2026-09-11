import type { DissectedComponent } from '../../types';
import { UI_DISSECT_HOST_ID } from '../dom';
import { Highlighter } from './highlighter';
import { LiveEditor } from '../editor';
import {
  parseColor,
  toHex,
  toCssColor,
  compositeOver,
  judgeContrast,
  type RGBA
} from '../color';

type PanelFormat = 'tailwind' | 'css' | 'react' | 'tokens' | 'edit';

interface ShadowParts {
  color: RGBA;
  offsetX: number;
  offsetY: number;
  blur: number;
}

const PANEL_WIDTH = 380;

export class DissectHUD {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private highlighter: Highlighter;
  private hudPanel: HTMLElement;
  private statusBar: HTMLElement;
  private editor: LiveEditor;
  private currentComponent: DissectedComponent | null = null;
  private currentElement: HTMLElement | null = null;
  private currentFormat: PanelFormat = 'css';
  /** Captured once when the Edit pane is built, so shadow sliders do not drift. */
  private shadowBase: ShadowParts | null = null;

  /** Set by the inspector: re-dissects the element so generators see live edits. */
  public onRefresh: (() => void) | null = null;

  constructor(editor: LiveEditor) {
    this.editor = editor;

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
    (document.body || document.documentElement).appendChild(this.host);

    this.injectStyles();
    this.highlighter = new Highlighter(this.shadow);

    this.statusBar = document.createElement('div');
    this.statusBar.className = 'dissect-status-bar';
    this.statusBar.innerHTML = `
      <span class="status-dot"></span>
      <span><strong>UI Dissect Active</strong> &mdash; Hover any element, press <kbd>Space</kbd> to freeze</span>
    `;
    this.shadow.appendChild(this.statusBar);

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
        background: rgba(10, 14, 23, 0.94);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(99, 102, 241, 0.5);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), 0 0 15px rgba(99, 102, 241, 0.3);
        color: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        padding: 6px 16px;
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
      .dissect-hud-panel {
        position: fixed;
        pointer-events: auto;
        width: ${PANEL_WIDTH}px;
        max-height: calc(100vh - 28px);
        overflow-y: auto;
        background: rgba(10, 14, 23, 0.96);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08);
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
        background: rgba(56, 189, 248, 0.15);
        border: 1px solid #38bdf8;
        color: #7dd3fc;
        font-weight: 600;
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
        background: rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        color: #cbd5e1;
      }
      .hud-tabs {
        display: flex;
        gap: 3px;
        background: rgba(255, 255, 255, 0.05);
        padding: 3px;
        border-radius: 8px;
        margin-bottom: 8px;
      }
      .hud-tab {
        flex: 1;
        padding: 5px 0;
        font-size: 10px;
        font-weight: 600;
        text-align: center;
        border-radius: 6px;
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .hud-tab.active {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
      .hud-tab.edit-tab.active {
        background: rgba(99, 102, 241, 0.45);
        color: #fff;
      }
      .hud-tab .dirty-dot {
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #fbbf24;
        margin-left: 3px;
        vertical-align: middle;
      }
      .hud-code-box {
        background: #060910;
        border: 1px solid rgba(255, 255, 255, 0.1);
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

      /* ---- Live edit pane ---- */
      .edit-pane {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .edit-row {
        display: grid;
        grid-template-columns: 78px 1fr auto;
        align-items: center;
        gap: 8px;
      }
      .edit-row label {
        font-size: 10px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
      .edit-controls {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .edit-val {
        font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
        font-size: 10px;
        color: #7dd3fc;
        white-space: nowrap;
        text-align: right;
        min-width: 70px;
      }
      .edit-pane input[type="color"] {
        -webkit-appearance: none;
        appearance: none;
        width: 26px;
        height: 22px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 5px;
        background: transparent;
        cursor: pointer;
        flex: none;
      }
      .edit-pane input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
      .edit-pane input[type="color"]::-webkit-color-swatch {
        border: none;
        border-radius: 3px;
      }
      .edit-pane input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.16);
        outline: none;
        cursor: pointer;
        flex: 1;
        min-width: 0;
      }
      .edit-pane input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #818cf8;
        border: 2px solid #0a0e17;
        cursor: pointer;
      }
      .contrast-card {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 8px 10px;
      }
      .contrast-swatch {
        width: 38px;
        height: 34px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        border: 1px solid rgba(255, 255, 255, 0.18);
        flex: none;
      }
      .contrast-mid { flex: 1; min-width: 0; }
      .contrast-ratio {
        font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
        font-size: 15px;
        font-weight: 700;
        color: #f1f5f9;
        line-height: 1.1;
      }
      .contrast-sub {
        font-size: 9px;
        color: #94a3b8;
        margin-top: 2px;
        line-height: 1.3;
      }
      .contrast-badges { display: flex; gap: 4px; flex: none; }
      .cbadge {
        font-size: 9px;
        font-weight: 700;
        padding: 3px 6px;
        border-radius: 4px;
        letter-spacing: 0.03em;
      }
      .cbadge.ok { background: rgba(34, 197, 94, 0.18); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.45); }
      .cbadge.no { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); }
      .contrast-na {
        font-size: 10px;
        color: #94a3b8;
        line-height: 1.4;
      }
      .edit-actions { display: flex; gap: 6px; margin-top: 2px; }
      .edit-btn {
        flex: 1;
        background: rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 6px;
        padding: 6px 8px;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
      }
      .edit-btn:hover { background: rgba(255, 255, 255, 0.14); color: #fff; }
      .edit-btn:disabled { opacity: 0.4; cursor: default; }
      .edit-note {
        font-size: 9px;
        color: #64748b;
        line-height: 1.4;
        margin: 0;
      }
    `;
    this.shadow.appendChild(style);
  }

  public updateHighlight(rect: { top: number; left: number; width: number; height: number }, isFrozen: boolean) {
    this.highlighter.update(rect, isFrozen);
  }

  public render(comp: DissectedComponent, isFrozen: boolean, el?: HTMLElement | null) {
    this.currentComponent = comp;
    if (el !== undefined) this.currentElement = el;
    this.highlighter.update(comp.rect, isFrozen);

    if (!isFrozen) {
      this.hudPanel.style.display = 'none';
      return;
    }

    const editable = this.currentElement !== null;
    if (this.currentFormat === 'edit' && !editable) this.currentFormat = 'css';

    const traitsHtml = (comp.classification?.traits || [])
      .map((t) => `<span class="trait-pill">${escapeHtml(t)}</span>`)
      .join('');

    const dirty = editable && this.editor.isEdited(this.currentElement!);
    const bodyHtml =
      this.currentFormat === 'edit'
        ? `<div class="edit-pane">${this.editPaneMarkup(this.currentElement!)}</div>`
        : `<div class="hud-code-box">${escapeHtml(this.codeFor(comp))}</div>`;

    this.hudPanel.innerHTML = `
      <div class="hud-header">
        <span class="hud-tag">&lt;${escapeHtml((comp.tagName || 'DIV').toLowerCase())}&gt;</span>
        <span class="hud-badge">&#10052; ${escapeHtml(comp.classification?.title || 'Component')}</span>
      </div>
      <div class="hud-traits">${traitsHtml}</div>
      <div class="hud-tabs">
        <button class="hud-tab ${this.currentFormat === 'css' ? 'active' : ''}" data-fmt="css">CSS</button>
        <button class="hud-tab ${this.currentFormat === 'tailwind' ? 'active' : ''}" data-fmt="tailwind">Tailwind</button>
        <button class="hud-tab ${this.currentFormat === 'react' ? 'active' : ''}" data-fmt="react">React</button>
        <button class="hud-tab ${this.currentFormat === 'tokens' ? 'active' : ''}" data-fmt="tokens">Tokens</button>
        <button class="hud-tab edit-tab ${this.currentFormat === 'edit' ? 'active' : ''}" data-fmt="edit" ${editable ? '' : 'disabled'}>Edit${dirty ? '<span class="dirty-dot"></span>' : ''}</button>
      </div>
      ${bodyHtml}
      <div class="hud-footer">
        <span><kbd>Space</kbd> Unfreeze | <kbd>&uarr;/&darr;</kbd> Layer</span>
        <button class="copy-btn" id="hudCopyBtn">${this.currentFormat === 'edit' ? 'Copy edited CSS' : 'Copy Code'}</button>
      </div>
    `;

    this.wireTabs(comp, isFrozen);

    if (this.currentFormat === 'edit' && this.currentElement) {
      this.wireEditPane(this.currentElement);
    }

    const copyBtn = this.hudPanel.querySelector<HTMLButtonElement>('#hudCopyBtn');
    copyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyCurrentCode();
    });

    this.hudPanel.style.display = 'block';
    this.positionPanel(comp.rect);
  }

  private codeFor(comp: DissectedComponent): string {
    if (this.currentFormat === 'tailwind') return comp.code?.tailwind || '/* No utility classes extracted */';
    if (this.currentFormat === 'react') return comp.code?.react || '/* No React component generated */';
    if (this.currentFormat === 'tokens') {
      const tokens = comp.code?.tokens || {};
      return Object.keys(tokens).length > 0
        ? Object.entries(tokens).map(([k, v]) => `${k}: ${v};`).join('\n')
        : '/* No CSS variables found on element */';
    }
    return comp.code?.css || '/* No CSS rules generated */';
  }

  private wireTabs(comp: DissectedComponent, isFrozen: boolean) {
    this.hudPanel.querySelectorAll<HTMLButtonElement>('.hud-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        if (tab.disabled) return;
        const next = tab.dataset.fmt as PanelFormat;
        const leavingEdit = this.currentFormat === 'edit' && next !== 'edit';
        this.currentFormat = next;

        // Leaving Edit with live changes: re-dissect so the generated code
        // reflects what is now on screen rather than the original styles.
        if (leavingEdit && this.currentElement && this.editor.isEdited(this.currentElement) && this.onRefresh) {
          this.onRefresh();
        } else {
          this.render(comp, isFrozen, this.currentElement);
        }
      });
    });
  }

  // ---------------------------------------------------------------- edit pane

  private editPaneMarkup(el: HTMLElement): string {
    const cs = window.getComputedStyle(el);
    const bg = parseColor(cs.backgroundColor);
    const fg = parseColor(cs.color);
    const bc = parseColor(cs.borderTopColor);
    const radius = Number.parseFloat(cs.borderTopLeftRadius) || 0;
    const borderWidth = Number.parseFloat(cs.borderTopWidth) || 0;
    const fontSize = Number.parseFloat(cs.fontSize) || 16;

    this.shadowBase = parseFirstShadow(cs.boxShadow);

    const bgHex = bg ? toHex(bg) : '#000000';
    const bgAlphaPct = bg ? Math.round(bg.a * 100) : 0;
    const fgHex = fg ? toHex(fg) : '#ffffff';
    const bcHex = bc ? toHex(bc) : '#ffffff';
    const shadowBlur = this.shadowBase ? Math.round(this.shadowBase.blur) : 0;
    const shadowAlphaPct = this.shadowBase ? Math.round(this.shadowBase.color.a * 100) : 0;

    const radiusMax = Math.min(200, Math.max(64, Math.ceil(radius)));
    const fontMax = Math.max(48, Math.ceil(fontSize));
    const editedElsewhere = this.editor.editedCount();
    const thisEdited = this.editor.isEdited(el);

    return `
      <div class="edit-row">
        <label>Background</label>
        <div class="edit-controls">
          <input type="color" data-edit="bgColor" value="${bgHex}" title="Background colour">
          <input type="range" data-edit="bgAlpha" min="0" max="100" value="${bgAlphaPct}" title="Background opacity">
        </div>
        <span class="edit-val" data-val="bg">${bgHex} ${bgAlphaPct}%</span>
      </div>

      <div class="edit-row">
        <label>Text</label>
        <div class="edit-controls">
          <input type="color" data-edit="fgColor" value="${fgHex}" title="Text colour">
        </div>
        <span class="edit-val" data-val="fg">${fgHex}</span>
      </div>

      <div class="contrast-card">${this.contrastMarkup(el)}</div>

      <div class="edit-row">
        <label>Radius</label>
        <div class="edit-controls">
          <input type="range" data-edit="radius" min="0" max="${radiusMax}" value="${Math.min(radius, radiusMax)}">
        </div>
        <span class="edit-val" data-val="radius">${Math.round(radius)}px</span>
      </div>

      <div class="edit-row">
        <label>Border</label>
        <div class="edit-controls">
          <input type="color" data-edit="borderColor" value="${bcHex}" title="Border colour">
          <input type="range" data-edit="borderWidth" min="0" max="8" value="${Math.min(Math.round(borderWidth), 8)}" title="Border width">
        </div>
        <span class="edit-val" data-val="border">${Math.round(borderWidth)}px</span>
      </div>

      <div class="edit-row">
        <label>Shadow</label>
        <div class="edit-controls">
          <input type="range" data-edit="shadowBlur" min="0" max="80" value="${Math.min(shadowBlur, 80)}" title="Shadow blur">
          <input type="range" data-edit="shadowAlpha" min="0" max="100" value="${shadowAlphaPct}" title="Shadow opacity">
        </div>
        <span class="edit-val" data-val="shadow">${Math.min(shadowBlur, 80)}px ${shadowAlphaPct}%</span>
      </div>

      <div class="edit-row">
        <label>Font size</label>
        <div class="edit-controls">
          <input type="range" data-edit="fontSize" min="8" max="${fontMax}" value="${Math.round(fontSize)}">
        </div>
        <span class="edit-val" data-val="fontSize">${Math.round(fontSize)}px</span>
      </div>

      <div class="edit-actions">
        <button class="edit-btn" id="editReset" ${thisEdited ? '' : 'disabled'}>Reset this element</button>
        <button class="edit-btn" id="editResetAll" ${editedElsewhere > 1 ? '' : 'disabled'}>Reset all (${editedElsewhere})</button>
      </div>

      <p class="edit-note">Changes are applied as inline styles on the live page and disappear on reload. Nothing is saved or sent anywhere.</p>
    `;
  }

  private contrastMarkup(el: HTMLElement): string {
    const cs = window.getComputedStyle(el);
    const textColor = parseColor(cs.color);
    const ownBg = parseColor(cs.backgroundColor);
    const hasImage = !!cs.backgroundImage && cs.backgroundImage !== 'none';

    if (!textColor) {
      return `<div class="contrast-na">Contrast not measurable &mdash; text colour could not be read.</div>`;
    }
    if (hasImage && (!ownBg || ownBg.a < 1)) {
      return `<div class="contrast-na">Contrast not measurable &mdash; this element sits on a gradient or image background.</div>`;
    }

    const parentColor = parseColor(this.currentComponent?.parentBackground || '');
    let assumedWhite = false;
    let backdrop: RGBA;

    if (ownBg && ownBg.a >= 1) {
      backdrop = ownBg;
    } else {
      let under: RGBA;
      if (parentColor && parentColor.a >= 1) {
        under = parentColor;
      } else {
        under = { r: 255, g: 255, b: 255, a: 1 };
        assumedWhite = true;
      }
      backdrop = ownBg ? compositeOver(ownBg, under) : under;
    }

    const text = textColor.a >= 1 ? textColor : compositeOver(textColor, backdrop);
    const fontSize = Number.parseFloat(cs.fontSize) || 16;
    const verdict = judgeContrast(text, backdrop, fontSize, cs.fontWeight);

    const hasOwnText = Array.from(el.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim().length > 0
    );

    const notes: string[] = [verdict.large ? 'large text (needs 3:1)' : 'normal text (needs 4.5:1)'];
    if (assumedWhite) notes.push('assumes white page behind');
    if (!hasOwnText) notes.push('no direct text in this element');

    return `
      <div class="contrast-swatch" style="background:${toCssColor(backdrop)};color:${toCssColor(text)}">Aa</div>
      <div class="contrast-mid">
        <div class="contrast-ratio">${verdict.ratio.toFixed(2)}:1</div>
        <div class="contrast-sub">${escapeHtml(notes.join(' · '))}</div>
      </div>
      <div class="contrast-badges">
        <span class="cbadge ${verdict.aa ? 'ok' : 'no'}">AA</span>
        <span class="cbadge ${verdict.aaa ? 'ok' : 'no'}">AAA</span>
      </div>
    `;
  }

  private wireEditPane(el: HTMLElement) {
    const input = (name: string) =>
      this.hudPanel.querySelector<HTMLInputElement>(`[data-edit="${name}"]`);
    const readout = (name: string) =>
      this.hudPanel.querySelector<HTMLElement>(`[data-val="${name}"]`);

    const afterChange = () => {
      const card = this.hudPanel.querySelector<HTMLElement>('.contrast-card');
      if (card) card.innerHTML = this.contrastMarkup(el);
      const resetBtn = this.hudPanel.querySelector<HTMLButtonElement>('#editReset');
      if (resetBtn) resetBtn.disabled = !this.editor.isEdited(el);
      // The pane is built once, so the cross-element counter has to be kept current.
      const resetAllBtn = this.hudPanel.querySelector<HTMLButtonElement>('#editResetAll');
      if (resetAllBtn) {
        const edited = this.editor.editedCount();
        resetAllBtn.textContent = `Reset all (${edited})`;
        resetAllBtn.disabled = edited < 2;
      }
      const editTab = this.hudPanel.querySelector<HTMLElement>('.edit-tab');
      if (editTab && this.editor.isEdited(el) && !editTab.querySelector('.dirty-dot')) {
        editTab.insertAdjacentHTML('beforeend', '<span class="dirty-dot"></span>');
      }
    };

    const bgColor = input('bgColor');
    const bgAlpha = input('bgAlpha');
    const applyBackground = () => {
      if (!bgColor || !bgAlpha) return;
      const base = parseColor(bgColor.value);
      if (!base) return;
      const next: RGBA = { ...base, a: Number(bgAlpha.value) / 100 };
      this.editor.set(el, 'background-color', toCssColor(next));
      // A gradient or image sits above background-color, so a colour edit would be
      // invisible until it is cleared.
      const cs = window.getComputedStyle(el);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        this.editor.set(el, 'background-image', 'none');
      }
      const r = readout('bg');
      if (r) r.textContent = `${bgColor.value} ${bgAlpha.value}%`;
      afterChange();
    };
    bgColor?.addEventListener('input', applyBackground);
    bgAlpha?.addEventListener('input', applyBackground);

    const fgColor = input('fgColor');
    fgColor?.addEventListener('input', () => {
      if (!fgColor) return;
      const c = parseColor(fgColor.value);
      if (!c) return;
      this.editor.set(el, 'color', toCssColor(c));
      const r = readout('fg');
      if (r) r.textContent = fgColor.value;
      afterChange();
    });

    const radius = input('radius');
    radius?.addEventListener('input', () => {
      if (!radius) return;
      this.editor.set(el, 'border-radius', `${radius.value}px`);
      const r = readout('radius');
      if (r) r.textContent = `${radius.value}px`;
      afterChange();
    });

    const borderColor = input('borderColor');
    const borderWidth = input('borderWidth');
    const applyBorder = () => {
      if (!borderColor || !borderWidth) return;
      const c = parseColor(borderColor.value);
      if (!c) return;
      const width = Number(borderWidth.value);
      this.editor.setMany(el, {
        'border-color': toCssColor(c),
        'border-width': `${width}px`,
        'border-style': width > 0 ? 'solid' : 'none'
      });
      const r = readout('border');
      if (r) r.textContent = `${width}px`;
      afterChange();
    };
    borderColor?.addEventListener('input', applyBorder);
    borderWidth?.addEventListener('input', applyBorder);

    const shadowBlur = input('shadowBlur');
    const shadowAlpha = input('shadowAlpha');
    const applyShadow = () => {
      if (!shadowBlur || !shadowAlpha) return;
      const blur = Number(shadowBlur.value);
      const alpha = Number(shadowAlpha.value) / 100;
      const base = this.shadowBase;
      if (blur <= 0 && alpha <= 0) {
        this.editor.set(el, 'box-shadow', 'none');
      } else {
        const color: RGBA = base ? { ...base.color, a: alpha } : { r: 0, g: 0, b: 0, a: alpha };
        const offsetX = base ? base.offsetX : 0;
        const offsetY = base ? base.offsetY : Math.round(blur / 3);
        this.editor.set(el, 'box-shadow', `${offsetX}px ${offsetY}px ${blur}px ${toCssColor(color)}`);
      }
      const r = readout('shadow');
      if (r) r.textContent = `${blur}px ${shadowAlpha.value}%`;
      afterChange();
    };
    shadowBlur?.addEventListener('input', applyShadow);
    shadowAlpha?.addEventListener('input', applyShadow);

    const fontSize = input('fontSize');
    fontSize?.addEventListener('input', () => {
      if (!fontSize) return;
      this.editor.set(el, 'font-size', `${fontSize.value}px`);
      const r = readout('fontSize');
      if (r) r.textContent = `${fontSize.value}px`;
      afterChange();
    });

    this.hudPanel.querySelector<HTMLButtonElement>('#editReset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editor.reset(el);
      this.onRefresh ? this.onRefresh() : this.rerender();
    });

    this.hudPanel.querySelector<HTMLButtonElement>('#editResetAll')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editor.resetAll();
      this.onRefresh ? this.onRefresh() : this.rerender();
    });
  }

  private rerender() {
    if (this.currentComponent) this.render(this.currentComponent, true, this.currentElement);
  }

  // -------------------------------------------------------------------- misc

  public renderFallback(el: HTMLElement, err?: any) {
    const rect = el.getBoundingClientRect();
    const comp = window.getComputedStyle(el);
    this.currentElement = el;
    this.highlighter.update(rect, true);

    const errorHtml = err
      ? `<div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; padding: 6px 10px; border-radius: 6px; font-size: 10px; margin-bottom: 8px; font-family: monospace; white-space: pre-wrap; word-break: break-all;"><strong>Diagnostics:</strong> ${escapeHtml(err?.message || String(err))}</div>`
      : '';

    const className = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
    const simpleCss = `.${className || 'component'} {
  background: ${comp.backgroundColor};
  color: ${comp.color};
  border-radius: ${comp.borderRadius};
  box-shadow: ${comp.boxShadow};
}`;

    this.hudPanel.innerHTML = `
      <div class="hud-header">
        <span class="hud-tag">&lt;${escapeHtml(el.tagName.toLowerCase())}&gt;</span>
        <span class="hud-badge">&#10052; Direct Extract</span>
      </div>
      ${errorHtml}
      <div class="hud-code-box">${escapeHtml(simpleCss)}</div>
      <div class="hud-footer">
        <span><kbd>Space</kbd> Unfreeze</span>
        <button class="copy-btn" id="hudCopyBtn">Copy Code</button>
      </div>
    `;

    const copyBtn = this.hudPanel.querySelector<HTMLButtonElement>('#hudCopyBtn');
    copyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(simpleCss);
      if (copyBtn) copyBtn.textContent = 'Copied! ✓';
    });

    this.hudPanel.style.display = 'block';
    this.positionPanel(rect);
  }

  public copyCurrentCode() {
    // Regenerate first so live edits end up in the copied code.
    if (this.currentElement && this.editor.isEdited(this.currentElement) && this.onRefresh) {
      this.onRefresh();
    }
    const comp = this.currentComponent;
    if (!comp) return;

    const format: PanelFormat = this.currentFormat === 'edit' ? 'css' : this.currentFormat;
    let text = '';
    if (format === 'tailwind') text = comp.code?.tailwind || '';
    else if (format === 'react') text = comp.code?.react || '';
    else if (format === 'tokens') {
      text = Object.entries(comp.code?.tokens || {})
        .map(([k, v]) => `${k}: ${v};`)
        .join('\n');
    } else text = comp.code?.css || '';

    navigator.clipboard.writeText(text).catch(() => {});

    const copyBtn = this.hudPanel.querySelector<HTMLButtonElement>('#hudCopyBtn');
    if (copyBtn) {
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied! ✓';
      setTimeout(() => {
        const btn = this.hudPanel.querySelector<HTMLButtonElement>('#hudCopyBtn');
        if (btn) btn.textContent = original || 'Copy Code';
      }, 1200);
    }
  }

  private positionPanel(rect: { top: number; left: number; width: number; height: number }) {
    const pad = 14;
    const panelHeight = this.hudPanel.offsetHeight || 280;

    let left = rect.left;
    if (left + PANEL_WIDTH > window.innerWidth - pad) {
      left = window.innerWidth - PANEL_WIDTH - pad;
    }
    if (left < pad) left = pad;

    let top = rect.top + rect.height + pad;
    if (top + panelHeight > window.innerHeight - pad) {
      top = rect.top - panelHeight - pad;
    }
    if (top < pad) {
      top = Math.max(pad, window.innerHeight - panelHeight - pad);
      left = Math.max(pad, window.innerWidth - PANEL_WIDTH - 20);
    }

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

/** Reads the first layer of a computed box-shadow, which puts the colour first. */
function parseFirstShadow(value: string): ShadowParts | null {
  if (!value || value === 'none') return null;
  const m = value.match(
    /(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/
  );
  if (!m) return null;
  const color = parseColor(m[1]);
  if (!color) return null;
  return {
    color,
    offsetX: Number.parseFloat(m[2]),
    offsetY: Number.parseFloat(m[3]),
    blur: Number.parseFloat(m[4])
  };
}

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
