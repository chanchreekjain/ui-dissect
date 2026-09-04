export type AestheticCategory =
  | 'glassmorphism'
  | 'cyberpunk-hud'
  | 'dark-glow'
  | 'neumorphism'
  | 'gradient-mesh'
  | 'minimalist-flat'
  | 'unknown';

export interface VisualBorder {
  width: string;
  style: string;
  color: string;
  radius: string;
}

export interface TypographyStyles {
  color: string;
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  letterSpacing: string;
  lineHeight: string;
  textShadow: string;
}

export interface AestheticStyles {
  background: string;
  backgroundColor: string;
  backgroundImage: string;
  backdropFilter: string;
  boxShadow: string;
  border: VisualBorder;
  typography: TypographyStyles;
  opacity: string;
  filter: string;
  mixBlendMode: string;
  clipPath: string;
  transition: string;
  transform: string;
}

export interface PseudoElementStyles {
  content: string;
  styles: Partial<AestheticStyles>;
}

export interface AestheticClassification {
  category: AestheticCategory;
  title: string;
  confidence: number;
  traits: string[];
}

export interface ExportCodeFormats {
  css: string;
  tailwind: string;
  react: string;
  tokens: Record<string, string>;
}

export interface DissectedComponent {
  tagName: string;
  id: string | null;
  classList: string[];
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  classification: AestheticClassification;
  styles: AestheticStyles;
  pseudo: {
    before: PseudoElementStyles | null;
    after: PseudoElementStyles | null;
  };
  parentBackground: string;
  code: ExportCodeFormats;
}

export interface InspectorState {
  isActive: boolean;
  isFrozen: boolean;
  hasTarget: boolean;
}
