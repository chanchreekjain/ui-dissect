// src/content/dom.ts
var UI_DISSECT_HOST_ID = "ui-dissect-host";
function isDissectElement(node) {
  if (!node) return false;
  if (node instanceof HTMLElement && node.id === UI_DISSECT_HOST_ID) return true;
  if (node.parentElement && isDissectElement(node.parentElement)) return true;
  const root = node.getRootNode();
  if (root instanceof ShadowRoot && root.host?.id === UI_DISSECT_HOST_ID) return true;
  return false;
}

// src/content/extractor/computed.ts
function extractAestheticStyles(el) {
  const comp = window.getComputedStyle(el);
  const border = {
    width: comp.borderWidth,
    style: comp.borderStyle,
    color: comp.borderColor,
    radius: comp.borderRadius
  };
  const typography = {
    color: comp.color,
    fontSize: comp.fontSize,
    fontWeight: comp.fontWeight,
    fontFamily: comp.fontFamily,
    letterSpacing: comp.letterSpacing === "normal" ? "0px" : comp.letterSpacing,
    lineHeight: comp.lineHeight,
    textShadow: comp.textShadow === "none" ? "" : comp.textShadow
  };
  const backdropFilter = comp.backdropFilter || comp.getPropertyValue("-webkit-backdrop-filter") || "none";
  return {
    background: comp.background,
    backgroundColor: comp.backgroundColor,
    backgroundImage: comp.backgroundImage === "none" ? "" : comp.backgroundImage,
    backdropFilter: backdropFilter === "none" ? "" : backdropFilter,
    boxShadow: comp.boxShadow === "none" ? "" : comp.boxShadow,
    border,
    typography,
    opacity: comp.opacity === "1" ? "" : comp.opacity,
    filter: comp.filter === "none" ? "" : comp.filter,
    mixBlendMode: comp.mixBlendMode === "normal" ? "" : comp.mixBlendMode,
    clipPath: comp.clipPath === "none" ? "" : comp.clipPath,
    transition: comp.transition === "all 0s ease 0s" ? "" : comp.transition,
    transform: comp.transform === "none" ? "" : comp.transform
  };
}

// src/content/extractor/variables.ts
function extractCssVariables(el) {
  const comp = window.getComputedStyle(el);
  const vars = {};
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style[i];
    if (prop.startsWith("--")) {
      vars[prop] = el.style.getPropertyValue(prop).trim();
    }
  }
  const commonTokenKeys = [
    "--bg",
    "--background",
    "--bg-color",
    "--color",
    "--text-color",
    "--border",
    "--border-color",
    "--accent",
    "--primary",
    "--glow",
    "--shadow",
    "--radius",
    "--blur"
  ];
  for (const key of commonTokenKeys) {
    const val = comp.getPropertyValue(key).trim();
    if (val && !vars[key]) {
      vars[key] = val;
    }
  }
  return vars;
}

// src/content/extractor/pseudo.ts
function extractPseudo(el, pseudoName) {
  const comp = window.getComputedStyle(el, pseudoName);
  const content = comp.getPropertyValue("content");
  if (!content || content === "none" || content === "normal" || comp.display === "none") {
    return null;
  }
  const bg = comp.background;
  const bgImg = comp.backgroundImage;
  const shadow = comp.boxShadow;
  const border = comp.border;
  const filter = comp.filter;
  const hasVisuals = bgImg && bgImg !== "none" || shadow && shadow !== "none" || border && !border.includes("0px") || filter && filter !== "none";
  if (!hasVisuals && comp.width === "0px" && comp.height === "0px") {
    return null;
  }
  return {
    content,
    styles: {
      background: bg,
      backgroundImage: bgImg === "none" ? "" : bgImg,
      boxShadow: shadow === "none" ? "" : shadow,
      backdropFilter: comp.backdropFilter === "none" ? "" : comp.backdropFilter,
      filter: filter === "none" ? "" : filter,
      opacity: comp.opacity === "1" ? "" : comp.opacity,
      clipPath: comp.clipPath === "none" ? "" : comp.clipPath
    }
  };
}
function extractPseudoElements(el) {
  return {
    before: extractPseudo(el, "::before"),
    after: extractPseudo(el, "::after")
  };
}

// src/content/extractor/parent.ts
function extractParentBackdrop(el) {
  let current = el.parentElement;
  while (current && current !== document.documentElement) {
    const comp = window.getComputedStyle(current);
    const bg = comp.backgroundColor;
    const bgImg = comp.backgroundImage;
    if (bgImg && bgImg !== "none") {
      return bgImg;
    }
    if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
      return bg;
    }
    current = current.parentElement;
  }
  return "#0a0d14";
}

// src/content/classifier.ts
function classifyAesthetic(styles, pseudo) {
  const traits = [];
  const hasBackdropBlur = Boolean(styles.backdropFilter && styles.backdropFilter.includes("blur"));
  const isTranslucentBg = styles.backgroundColor.includes("rgba") && !styles.backgroundColor.includes(", 1)");
  const hasSubtleBorder = styles.border.width !== "0px" && styles.border.color.includes("rgba");
  if (hasBackdropBlur || isTranslucentBg && hasSubtleBorder) {
    if (hasBackdropBlur) traits.push("Backdrop Blur");
    if (isTranslucentBg) traits.push("Translucent Glass Fill");
    if (hasSubtleBorder) traits.push("Specular Rim Border");
    if (styles.boxShadow) traits.push("Diffused Depth Shadow");
    return {
      category: "glassmorphism",
      title: "\u2726 Glassmorphism",
      confidence: hasBackdropBlur ? 0.95 : 0.8,
      traits
    };
  }
  const isMonospace = /mono|code|consolas|fira|jetbrains/i.test(styles.typography.fontFamily);
  const hasNeonGlow = /rgba?\(\s*(?:0|5[0-9]|1[0-9]{2}|255)\s*,\s*(?:255|200)\s*,\s*(?:255|100)/i.test(styles.boxShadow || "") || /rgba?\(\s*(?:0|5[0-9]|1[0-9]{2}|255)\s*,\s*(?:255|200)\s*,\s*(?:255|100)/i.test(styles.typography.textShadow || "");
  const hasClipPath = Boolean(styles.clipPath);
  const hasHudPseudo = Boolean(pseudo.before?.styles.boxShadow || pseudo.after?.styles.boxShadow || pseudo.before?.styles.clipPath);
  if (hasNeonGlow || isMonospace && (hasClipPath || hasHudPseudo)) {
    if (hasNeonGlow) traits.push("Photonic Neon Glow");
    if (hasClipPath) traits.push("Chamfered Polygon Clip");
    if (isMonospace) traits.push("Technical Monospace");
    if (hasHudPseudo) traits.push("HUD Grid/Bracket Accents");
    return {
      category: "cyberpunk-hud",
      title: "\u2726 Mission-Control HUD",
      confidence: 0.92,
      traits
    };
  }
  const hasAmbientGlow = styles.boxShadow && /rgba?\([^)]+\)\s+(?:0px\s+){1,2}[1-9]/.test(styles.boxShadow);
  if (hasAmbientGlow) {
    traits.push("Radial Aura Glow");
    if (styles.border.width !== "0px") traits.push("Accent Border");
    return {
      category: "dark-glow",
      title: "\u2726 Radiant Dark Glow",
      confidence: 0.85,
      traits
    };
  }
  const hasDualShadow = styles.boxShadow && styles.boxShadow.includes(",") && (styles.boxShadow.includes("inset") || styles.boxShadow.includes("-"));
  if (hasDualShadow) {
    traits.push("Bi-directional Shadow");
    traits.push("Surface Emboss");
    return {
      category: "neumorphism",
      title: "\u2726 Neumorphic Soft UI",
      confidence: 0.8,
      traits
    };
  }
  if (styles.backgroundImage.includes("gradient")) {
    traits.push("Multi-stop Gradient");
    return {
      category: "gradient-mesh",
      title: "\u2726 Gradient Mesh Flow",
      confidence: 0.85,
      traits
    };
  }
  traits.push("Precision Typography");
  if (styles.border.width !== "0px") traits.push("Hairline Border");
  return {
    category: "minimalist-flat",
    title: "\u2726 Minimalist Modern",
    confidence: 0.7,
    traits
  };
}

// src/content/generators/css.ts
function generateCss(className2, styles, pseudo) {
  const lines = [];
  lines.push(`.${className2} {`);
  if (styles.backdropFilter) {
    lines.push(`  backdrop-filter: ${styles.backdropFilter};`);
    lines.push(`  -webkit-backdrop-filter: ${styles.backdropFilter};`);
  }
  if (styles.backgroundImage) {
    lines.push(`  background: ${styles.backgroundImage};`);
  } else if (styles.backgroundColor && styles.backgroundColor !== "rgba(0, 0, 0, 0)") {
    lines.push(`  background-color: ${styles.backgroundColor};`);
  }
  if (styles.border.width !== "0px" && styles.border.style !== "none") {
    lines.push(`  border: ${styles.border.width} ${styles.border.style} ${styles.border.color};`);
  }
  if (styles.border.radius && styles.border.radius !== "0px") {
    lines.push(`  border-radius: ${styles.border.radius};`);
  }
  if (styles.boxShadow) {
    lines.push(`  box-shadow: ${styles.boxShadow};`);
  }
  if (styles.typography.color) {
    lines.push(`  color: ${styles.typography.color};`);
  }
  if (styles.typography.fontFamily) {
    lines.push(`  font-family: ${styles.typography.fontFamily};`);
  }
  if (styles.typography.fontSize) {
    lines.push(`  font-size: ${styles.typography.fontSize};`);
  }
  if (styles.typography.fontWeight && styles.typography.fontWeight !== "400") {
    lines.push(`  font-weight: ${styles.typography.fontWeight};`);
  }
  if (styles.typography.letterSpacing && styles.typography.letterSpacing !== "0px") {
    lines.push(`  letter-spacing: ${styles.typography.letterSpacing};`);
  }
  if (styles.typography.textShadow) {
    lines.push(`  text-shadow: ${styles.typography.textShadow};`);
  }
  if (styles.clipPath) {
    lines.push(`  clip-path: ${styles.clipPath};`);
  }
  if (styles.mixBlendMode) {
    lines.push(`  mix-blend-mode: ${styles.mixBlendMode};`);
  }
  if (styles.filter) {
    lines.push(`  filter: ${styles.filter};`);
  }
  if (styles.transition) {
    lines.push(`  transition: ${styles.transition};`);
  }
  lines.push("}");
  if (pseudo.before) {
    lines.push("");
    lines.push(`.${className2}::before {`);
    lines.push(`  content: ${pseudo.before.content};`);
    if (pseudo.before.styles.background) lines.push(`  background: ${pseudo.before.styles.background};`);
    if (pseudo.before.styles.boxShadow) lines.push(`  box-shadow: ${pseudo.before.styles.boxShadow};`);
    if (pseudo.before.styles.clipPath) lines.push(`  clip-path: ${pseudo.before.styles.clipPath};`);
    lines.push("}");
  }
  if (pseudo.after) {
    lines.push("");
    lines.push(`.${className2}::after {`);
    lines.push(`  content: ${pseudo.after.content};`);
    if (pseudo.after.styles.background) lines.push(`  background: ${pseudo.after.styles.background};`);
    if (pseudo.after.styles.boxShadow) lines.push(`  box-shadow: ${pseudo.after.styles.boxShadow};`);
    if (pseudo.after.styles.clipPath) lines.push(`  clip-path: ${pseudo.after.styles.clipPath};`);
    lines.push("}");
  }
  return lines.join("\n");
}

// src/content/generators/tailwind.ts
function cleanVal(v) {
  return v.replace(/\s+/g, "_");
}
function generateTailwind(styles) {
  const classes = [];
  if (styles.backdropFilter) {
    const blurMatch = styles.backdropFilter.match(/blur\((\d+px)\)/);
    if (blurMatch) {
      classes.push(`backdrop-blur-[${blurMatch[1]}]`);
    } else {
      classes.push(`backdrop-blur-md`);
    }
  }
  if (styles.backgroundImage) {
    classes.push(`bg-[${cleanVal(styles.backgroundImage)}]`);
  } else if (styles.backgroundColor && styles.backgroundColor !== "rgba(0, 0, 0, 0)") {
    classes.push(`bg-[${cleanVal(styles.backgroundColor)}]`);
  }
  if (styles.border.width !== "0px" && styles.border.style !== "none") {
    classes.push(`border`);
    classes.push(`border-[${cleanVal(styles.border.color)}]`);
  }
  if (styles.border.radius && styles.border.radius !== "0px") {
    classes.push(`rounded-[${styles.border.radius}]`);
  }
  if (styles.boxShadow) {
    classes.push(`shadow-[${cleanVal(styles.boxShadow)}]`);
  }
  if (styles.typography.color) {
    classes.push(`text-[${cleanVal(styles.typography.color)}]`);
  }
  if (styles.typography.fontSize) {
    classes.push(`text-[${styles.typography.fontSize}]`);
  }
  if (styles.typography.fontWeight && styles.typography.fontWeight !== "400") {
    classes.push(`font-[${styles.typography.fontWeight}]`);
  }
  if (styles.typography.letterSpacing && styles.typography.letterSpacing !== "0px") {
    classes.push(`tracking-[${styles.typography.letterSpacing}]`);
  }
  return classes.join(" ");
}

// src/content/generators/react.ts
function generateReactComponent(comp) {
  const componentName = comp.classification.title.replace(/[^a-zA-Z0-9]/g, "").concat("Component");
  const tw = comp.code.tailwind;
  return `import React from 'react';

export interface ${componentName}Props {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Aesthetic: ${comp.classification.title}
 * Traits: ${comp.classification.traits.join(", ")}
 */
export const ${componentName}: React.FC<${componentName}Props> = ({ children, className = '' }) => {
  return (
    <div className={\`${tw} \\${className}\`}>
      {children ?? <span>${comp.classification.title}</span>}
    </div>
  );
};
`;
}

// src/content/hud/highlighter.ts
var Highlighter = class {
  box;
  constructor(shadowRoot) {
    this.box = document.createElement("div");
    this.box.id = "ui-dissect-laser-box";
    this.box.style.position = "fixed";
    this.box.style.pointerEvents = "none";
    this.box.style.boxSizing = "border-box";
    this.box.style.borderRadius = "4px";
    this.box.style.zIndex = "2147483646";
    this.box.style.display = "none";
    this.box.style.transition = "top 0.04s ease-out, left 0.04s ease-out, width 0.04s ease-out, height 0.04s ease-out";
    shadowRoot.appendChild(this.box);
  }
  update(rect, isFrozen) {
    this.box.style.display = "block";
    this.box.style.top = `${rect.top}px`;
    this.box.style.left = `${rect.left}px`;
    this.box.style.width = `${rect.width}px`;
    this.box.style.height = `${rect.height}px`;
    if (isFrozen) {
      this.box.style.border = "2px solid #38bdf8";
      this.box.style.background = "rgba(56, 189, 248, 0.18)";
      this.box.style.boxShadow = "0 0 25px rgba(56, 189, 248, 0.8), inset 0 0 15px rgba(56, 189, 248, 0.2)";
    } else {
      this.box.style.border = "2px solid #6366f1";
      this.box.style.background = "rgba(99, 102, 241, 0.14)";
      this.box.style.boxShadow = "0 0 18px rgba(99, 102, 241, 0.7), inset 0 0 10px rgba(99, 102, 241, 0.15)";
    }
  }
  hide() {
    this.box.style.display = "none";
  }
};

// src/content/hud/index.ts
var DissectHUD = class {
  host;
  shadow;
  highlighter;
  hudPanel;
  statusBar;
  currentComponent = null;
  currentFormat = "tailwind";
  constructor() {
    const existing = document.getElementById(UI_DISSECT_HOST_ID);
    if (existing) existing.remove();
    this.host = document.createElement("div");
    this.host.id = UI_DISSECT_HOST_ID;
    this.host.style.position = "fixed";
    this.host.style.top = "0";
    this.host.style.left = "0";
    this.host.style.width = "0";
    this.host.style.height = "0";
    this.host.style.pointerEvents = "none";
    this.host.style.zIndex = "2147483647";
    this.shadow = this.host.attachShadow({ mode: "open" });
    document.documentElement.appendChild(this.host);
    this.injectStyles();
    this.highlighter = new Highlighter(this.shadow);
    this.statusBar = document.createElement("div");
    this.statusBar.className = "dissect-status-bar";
    this.statusBar.innerHTML = `
      <span class="status-dot"></span>
      <span><strong>UI Dissect Active</strong> &mdash; Hover any element, press <kbd>Space</kbd> to freeze</span>
    `;
    this.shadow.appendChild(this.statusBar);
    this.hudPanel = document.createElement("div");
    this.hudPanel.className = "dissect-hud-panel";
    this.shadow.appendChild(this.hudPanel);
    this.hudPanel.style.display = "none";
  }
  injectStyles() {
    const style = document.createElement("style");
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
  render(comp, isFrozen) {
    this.currentComponent = comp;
    this.highlighter.update(comp.rect, isFrozen);
    if (!isFrozen) {
      this.hudPanel.style.display = "none";
      return;
    }
    let codeDisplay = "";
    if (this.currentFormat === "tailwind") codeDisplay = comp.code.tailwind;
    else if (this.currentFormat === "css") codeDisplay = comp.code.css;
    else if (this.currentFormat === "react") codeDisplay = comp.code.react;
    else if (this.currentFormat === "tokens") {
      codeDisplay = Object.entries(comp.code.tokens).map(([k, v]) => `${k}: ${v};`).join("\n") || "/* No custom variables found */";
    }
    const traitsHtml = comp.classification.traits.map((t) => `<span class="trait-pill">${t}</span>`).join("");
    this.hudPanel.innerHTML = `
      <div class="hud-header">
        <span class="hud-tag">&lt;${comp.tagName.toLowerCase()}&gt;</span>
        <span class="hud-badge frozen">\u2744 ${comp.classification.title}</span>
      </div>
      <div class="hud-traits">${traitsHtml}</div>
      <div class="hud-tabs">
        <button class="hud-tab ${this.currentFormat === "tailwind" ? "active" : ""}" data-fmt="tailwind">Tailwind</button>
        <button class="hud-tab ${this.currentFormat === "css" ? "active" : ""}" data-fmt="css">CSS</button>
        <button class="hud-tab ${this.currentFormat === "react" ? "active" : ""}" data-fmt="react">React</button>
        <button class="hud-tab ${this.currentFormat === "tokens" ? "active" : ""}" data-fmt="tokens">Tokens</button>
      </div>
      <div class="hud-code-box">${escapeHtml(codeDisplay)}</div>
      <div class="hud-footer">
        <span><kbd>Space</kbd> Unfreeze | <kbd>&uarr;/&darr;</kbd> Layer</span>
        <button class="copy-btn" id="hudCopyBtn">Copy Code</button>
      </div>
    `;
    this.hudPanel.querySelectorAll(".hud-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation();
        this.currentFormat = tab.dataset.fmt;
        this.render(comp, isFrozen);
      });
    });
    const copyBtn = this.hudPanel.querySelector("#hudCopyBtn");
    copyBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.copyCurrentCode();
    });
    this.positionPanel(comp.rect);
    this.hudPanel.style.display = "block";
  }
  copyCurrentCode() {
    if (!this.currentComponent) return;
    let text = "";
    if (this.currentFormat === "tailwind") text = this.currentComponent.code.tailwind;
    else if (this.currentFormat === "css") text = this.currentComponent.code.css;
    else if (this.currentFormat === "react") text = this.currentComponent.code.react;
    else if (this.currentFormat === "tokens") {
      text = Object.entries(this.currentComponent.code.tokens).map(([k, v]) => `${k}: ${v};`).join("\n");
    }
    navigator.clipboard.writeText(text);
    const copyBtn = this.hudPanel.querySelector("#hudCopyBtn");
    if (copyBtn) {
      copyBtn.textContent = "Copied! \u2713";
      setTimeout(() => {
        if (copyBtn) copyBtn.textContent = "Copy Code";
      }, 1200);
    }
  }
  positionPanel(rect) {
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
  hide() {
    this.highlighter.hide();
    this.hudPanel.style.display = "none";
  }
  destroy() {
    this.host.remove();
  }
};
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// src/content/freezer.ts
var StateFreezer = class {
  frozen = false;
  isFrozen() {
    return this.frozen;
  }
  freeze() {
    this.frozen = true;
  }
  unfreeze() {
    this.frozen = false;
  }
  toggle() {
    this.frozen = !this.frozen;
    return this.frozen;
  }
};

// src/content/inspector.ts
var DOMInspector = class {
  active = false;
  freezer = new StateFreezer();
  hud = null;
  currentElement = null;
  hierarchyStack = [];
  hierarchyIndex = 0;
  rafId = null;
  isActive() {
    return this.active;
  }
  getState() {
    return {
      isActive: this.active,
      isFrozen: this.freezer.isFrozen(),
      hasTarget: this.currentElement !== null
    };
  }
  start() {
    if (this.active) return;
    this.active = true;
    this.hud = new DissectHUD();
    this.bindEvents();
    this.notifyState();
  }
  stop() {
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
  toggle() {
    if (this.active) this.stop();
    else this.start();
  }
  toggleFreeze() {
    if (!this.active || !this.currentElement) return;
    const isFrozen = this.freezer.toggle();
    this.dissect(this.currentElement, isFrozen);
    this.notifyState();
  }
  navigateUp() {
    if (!this.active || this.hierarchyStack.length <= 1) return;
    if (this.hierarchyIndex < this.hierarchyStack.length - 1) {
      this.hierarchyIndex++;
      const el = this.hierarchyStack[this.hierarchyIndex];
      this.currentElement = el;
      this.dissect(el, this.freezer.isFrozen());
    }
  }
  navigateDown() {
    if (!this.active || this.hierarchyStack.length <= 1) return;
    if (this.hierarchyIndex > 0) {
      this.hierarchyIndex--;
      const el = this.hierarchyStack[this.hierarchyIndex];
      this.currentElement = el;
      this.dissect(el, this.freezer.isFrozen());
    }
  }
  copyCurrentCode() {
    this.hud?.copyCurrentCode();
  }
  handleMouseMove = (e) => {
    if (!this.active || this.freezer.isFrozen()) return;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      try {
        const path = e.composedPath ? e.composedPath() : [];
        let target = null;
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
        console.error("[UI Dissect] Mouse hover error:", err);
      }
    });
  };
  buildHierarchy(el) {
    this.hierarchyStack = [];
    let curr = el;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      if (!isDissectElement(curr)) {
        this.hierarchyStack.push(curr);
      }
      curr = curr.parentElement;
    }
    this.hierarchyIndex = 0;
  }
  dissect(el, isFrozen) {
    try {
      const rect = el.getBoundingClientRect();
      const styles = extractAestheticStyles(el);
      const pseudo = extractPseudoElements(el);
      const parentBg = extractParentBackdrop(el);
      const tokens = extractCssVariables(el);
      const classification = classifyAesthetic(styles, pseudo);
      const className2 = el.className && typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] || "dissected-component" : "dissected-component";
      const component = {
        tagName: el.tagName || "DIV",
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
          css: generateCss(className2, styles, pseudo),
          tailwind: generateTailwind(styles),
          react: "",
          tokens
        }
      };
      component.code.react = generateReactComponent(component);
      this.hud?.render(component, isFrozen);
    } catch (err) {
      console.error("[UI Dissect] Dissect error:", err);
    }
  }
  bindEvents() {
    window.addEventListener("mousemove", this.handleMouseMove, true);
  }
  unbindEvents() {
    window.removeEventListener("mousemove", this.handleMouseMove, true);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
  notifyState() {
    chrome.runtime.sendMessage({
      type: "STATE_CHANGED",
      state: this.getState()
    }).catch(() => {
    });
  }
};

// src/content/index.ts
var inspector = new DOMInspector();
console.log("[UI Dissect] Content script active. Press Ctrl+Shift+X or launch from popup.");
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyX") {
    e.preventDefault();
    inspector.toggle();
    console.log("[UI Dissect] Inspector toggled via hotkey:", inspector.isActive());
    return;
  }
  if (!inspector.isActive()) return;
  if (e.code === "Space" && !isInputFocused()) {
    e.preventDefault();
    inspector.toggleFreeze();
    return;
  }
  if (e.code === "ArrowUp") {
    e.preventDefault();
    inspector.navigateUp();
    return;
  }
  if (e.code === "ArrowDown") {
    e.preventDefault();
    inspector.navigateDown();
    return;
  }
  if (e.code === "KeyC" && !isInputFocused() && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    inspector.copyCurrentCode();
    return;
  }
  if (e.code === "Escape") {
    e.preventDefault();
    if (inspector.getState().isFrozen) {
      inspector.toggleFreeze();
    } else {
      inspector.stop();
    }
  }
});
function isInputFocused() {
  const active = document.activeElement;
  if (!active) return false;
  return active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable;
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "TOGGLE_INSPECTOR":
      inspector.toggle();
      console.log("[UI Dissect] Inspector toggled via popup message:", inspector.isActive());
      sendResponse({ success: true, state: inspector.getState() });
      break;
    case "FREEZE_INSPECTOR":
      inspector.toggleFreeze();
      sendResponse({ success: true, state: inspector.getState() });
      break;
    case "GET_STATE":
      sendResponse({ success: true, state: inspector.getState() });
      break;
    case "COPY_CODE":
      inspector.copyCurrentCode();
      sendResponse({ success: true });
      break;
  }
  return true;
});
