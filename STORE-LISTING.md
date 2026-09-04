# Chrome Web Store Listing: UI Dissect

## Extension Name
UI Dissect — The UI Reverse-Engineer

## Summary (132 characters max)
Hover over any modern UI element to freeze its state and instantly extract clean Tailwind, CSS, and React code for modern aesthetics.

## Detailed Description
Standard browser "Inspect Element" is clunky and slow when you simply want to extract the styling of a modern, high-fidelity UI component. You are forced to dig through hundreds of default browser styles, hunt down pseudo-elements, and fight with disappearing hover states.

UI Dissect is a developer tool built to extract the visual DNA of complex web design trends with surgical precision.

### Key Features
✦ Instant Hover Inspection: Hover over any button, card, or modal to highlight its geometry and reveal its core design properties.
✦ Freeze State with Spacebar: Lock transient hover effects, glowing menus, or animated micro-interactions in place with a single keypress.
✦ Automated Style Distillation: Filters out over 300 default browser styles to extract only what matters: backdrop-filter blurs, multi-layered shadows, gradient meshes, and precision borders.
✦ Aesthetic Archetype Detection: Automatically classifies components into trends like Glassmorphism, Mission-Control HUD, Radiant Dark Glow, and Neumorphic Soft UI.
✦ Multi-Target Code Generation: Switch seamlessly between Tailwind CSS utility classes, clean scoped CSS, React functional components, and CSS custom property token palettes.
✦ Shadow DOM Aware: Recursively traverses open shadow roots to inspect modern Web Components and custom elements.
✦ Hierarchy Navigation (↑/↓): Easily walk up to parent containers or down to child layers to dissect multi-layered surfaces.

### Keyboard Shortcuts
• Ctrl+Shift+X (Cmd+Shift+X on Mac): Toggle inspection mode
• Spacebar: Freeze / unfreeze hover target
• Arrow Up / Down: Traverse parent and child DOM layers
• C: Quick-copy active code format
• Esc: Exit inspection mode

### Privacy & Data Safety
UI Dissect operates 100% locally on your machine.
• No analytics or telemetry
• No remote server calls
• No external tracking
• Your code and browsing data never leave your browser

---

## Single-Purpose Description
UI Dissect serves a single purpose: enabling developers and designers to inspect and extract frontend styling code (CSS, Tailwind, React) from web page components on hover.

## Permission Justifications
- `activeTab`: Used strictly to inspect DOM element styles on the currently active tab when invoked by the user.
- `scripting`: Used to inject the inspection script into tabs opened before the extension was installed without requiring a page refresh.
- `storage`: Used solely to persist user preferences (such as default export format) locally on the user's device.
