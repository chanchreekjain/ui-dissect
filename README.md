# UI Dissect

Isolate and reverse-engineer modern UI aesthetics on hover — not 400 lines of DevTools junk.

Spot a perfect glassmorphism card, a sleek dark mode toggle, or an intricate mission-control HUD element? Hover over it, press `Space` to freeze the hover state in place, and UI Dissect extracts the exact aesthetic DNA needed to recreate it in your own projects: clean scoped CSS, Tailwind CSS utilities, or a ready-to-use React component.

---

## The Problem: The Computed Styles Trap

Opening Chrome DevTools and copying computed styles gives you a corpse:
`window.getComputedStyle(element)` returns over 300 CSS properties. 95% of them are default browser noise (`display: block`, `margin: 0px`, `font-style: normal`, `perspective-origin: ...`). Digging through nested CSS rules and inherited stylesheets to find why a card looks stunning takes minutes of manual work.

Worse, modern high-fidelity components rely heavily on:
1. **Transient states**: Glowing hover aura, active state shifts, and micro-interactions that disappear the moment you move your mouse to DevTools.
2. **Pseudo-elements (`::before` / `::after`)**: Angular HUD borders, gradient rims, and blurred glows are almost always painted in pseudo-elements, which standard inspector shortcuts completely miss.
3. **Contextual backdrops**: A glassmorphism component looks transparent and lifeless unless you also understand the background surface it is blurring.
4. **Encapsulated subtrees**: Custom elements and design systems wrapped in Web Components and Shadow DOM remain hidden from shallow DOM queries.

---

## How UI Dissect Actually Works

UI Dissect does **not** dump computed styles.

Instead, it feeds the target element through a **Style Distillation Pipeline**:

```
[Target DOM Node]
        │
        ├── 1. Pierce Open Shadow Roots (deep element matching)
        ├── 2. Isolate Aesthetic Properties (blurs, gradients, shadows, borders, typography)
        ├── 3. Resolve CSS Custom Properties (var(--*) token values)
        ├── 4. Probe Pseudo-elements (::before and ::after visual presence)
        ├── 5. Trace Parent Backdrop (sample underlying surface colors & gradients)
        │
        ▼
[Aesthetic Classifier]
  Detects: Glassmorphism, Mission-Control HUD, Dark Glow, Neumorphism, Gradient Mesh
        │
        ▼
[Code Exporters]
  ├── Scoped Vanilla CSS
  ├── Modern Tailwind CSS (v3 / v4 arbitrary syntax)
  ├── React / JSX Component
  └── Design Tokens Palette
```

### 1. The Freeze Primitive (`Space`)

Hovering highlights elements in real time. But interactive components often only display their best styling during `:hover` or `:focus`. 

Pressing **`Space`** freezes inspection immediately. The element's highlight locks into an ice-blue freeze state, hover event listeners suspend, and the floating HUD unlocks for full pointer interaction. You can click between export tabs, highlight text, and copy snippets without the component vanishing. Press `Space` or `Esc` to resume hover inspection.

### 2. Hierarchical Layer Traversal (`↑` / `↓`)

Modern components are layered sandwiches: an outer wrapper with a glowing drop-shadow, an inner container with a backdrop blur, and child content with typography styles.

When inspecting an element:
- Press **`↑` (Arrow Up)** to step up to the parent container.
- Press **`↓` (Arrow Down)** to step down to child layers.
- The bounding box and HUD recompute instantly at each step, allowing you to isolate exactly which wrapper owns which visual property.

### 3. Self-Isolation: Living in the Shadow DOM

If an inspector injects elements into the page, it risks inspecting its own highlight box or having the host page's CSS mangle its HUD.

UI Dissect mounts its entire interface into a dedicated `#ui-dissect-host` container with an **isolated Shadow Root**. Pointer-events are carefully guarded, and all traversal logic explicitly skips the host tree so UI Dissect never inspects itself.

### 4. Shadow DOM Piercing

Modern web apps (Lit, Shoelace, Reddit web components) encapsulate internal components inside shadow roots. Simple `document.elementFromPoint` stops at the shadow host. UI Dissect recursively queries `shadowRoot.elementFromPoint` across all open shadow trees to locate the true rendered node.

---

## Aesthetic Archetypes Detected

| Archetype | Key Signals Captured |
|---|---|
| **✦ Glassmorphism** | `backdrop-filter: blur()`, translucent RGBA fills, specular rim borders (`border: 1px solid rgba(255,255,255,0.15)`), soft depth shadows. |
| **✦ Mission-Control HUD** | Photonic neon drop-shadows, chamfered `clip-path` polygon cuts, monospace typography, and `::before`/`::after` corner bracket accents. |
| **✦ Radiant Dark Glow** | Layered ambient `box-shadow` auras, dark background bases, and luminous accent rims. |
| **✦ Neumorphic Soft UI** | Dual opposing shadows (positive light source + negative dark shadow, inset/outset emboss). |
| **✦ Gradient Mesh** | Complex multi-stop radial and linear gradient compositions. |
| **✦ Minimalist Modern** | Hairline borders, precision tracking/letter-spacing, and clean layout contrast. |

---

## Keyboard Controls

| Key | Action |
|---|---|
| `Ctrl+Shift+X` / `Cmd+Shift+X` | **Toggle Inspector** on / off |
| `Space` | **Freeze / Unfreeze** current target and activate HUD |
| `↑` | **Step Up** to parent DOM layer |
| `↓` | **Step Down** to child DOM layer |
| `C` | **Quick Copy** code for current tab |
| `Esc` | **Exit** inspection mode (or unfreeze) |

---

## Project Structure

```
ui-dissect/
├── public/
│   ├── manifest.json              # Chrome MV3 manifest and command bindings
│   └── icons/                     # Extension icons
├── src/
│   ├── types.ts                   # Component model, aesthetic categories, style contracts
│   ├── messages.ts                # Typed Content <-> Background <-> Popup protocol
│   ├── background/
│   │   └── index.ts               # Command hotkey listener and injection orchestrator
│   ├── content/
│   │   ├── index.ts               # Global keyboard listeners and message router
│   │   ├── inspector.ts           # RAF hover tracking and hierarchy navigation stack
│   │   ├── freezer.ts             # Freeze-state primitive
│   │   ├── classifier.ts          # Aesthetic taxonomy detection algorithms
│   │   ├── dom.ts                 # Open Shadow DOM traversal and self-exclusion
│   │   ├── extractor/
│   │   │   ├── computed.ts        # 300+ computed styles distilled to visual DNA
│   │   │   ├── variables.ts       # CSS custom property token extraction
│   │   │   ├── pseudo.ts          # ::before and ::after pseudo-element detection
│   │   │   └── parent.ts          # Contextual parent surface detection
│   │   ├── generators/
│   │   │   ├── css.ts             # Scoped CSS generator
│   │   │   ├── tailwind.ts        # Tailwind CSS utility and arbitrary syntax generator
│   │   │   └── react.ts           # Functional React component template
│   │   └── hud/
│   │       ├── index.ts           # Shadow DOM-isolated floating HUD
│   │       └── highlighter.ts     # Fixed bounding box overlay
│   └── popup/
│       ├── index.html             # Sleek dark-mode extension popup
│       └── index.ts               # Popup controllers and format preferences
├── esbuild.config.mjs             # Fast zero-dependency bundler
├── package.json
├── tsconfig.json
├── STORE-LISTING.md               # Chrome Web Store submission metadata
├── PRIVACY.md                     # Privacy policy
└── LICENSE                        # MIT License
```

---

## Installation & Development

### From Source

```bash
# Clone the repository
git clone https://github.com/chanchreekjain/ui-dissect.git
cd ui-dissect

# Install dependencies
npm install

# Build the extension
npm run build
```

### Load into Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right.
3. Click **Load unpacked** and select the `dist/` directory inside `ui-dissect`.
4. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS) on any web page to start dissecting.

To watch for changes during development:
```bash
npm run watch
```

---

## Permissions and Security

| Permission | Justification |
|---|---|
| `activeTab` | Required to access the DOM of the tab you explicitly inspect. |
| `scripting` | Injects the content script into tabs that were already open prior to installing the extension. |
| `storage` | Saves your default preferred output format (Tailwind vs CSS vs React) locally. |

**Zero Telemetry & 100% Client-Side:** UI Dissect has no remote servers, analytics, or background tracking. Everything runs directly inside your browser.

---

## License

MIT © 2026 Chanchreek Jain
