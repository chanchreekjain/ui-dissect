import type { DissectedComponent, InspectorState } from './types';

export type ExtensionMessage =
  | { type: 'TOGGLE_INSPECTOR' }
  | { type: 'FREEZE_INSPECTOR' }
  | { type: 'UNFREEZE_INSPECTOR' }
  | { type: 'GET_STATE' }
  | { type: 'STATE_CHANGED'; state: InspectorState }
  | { type: 'COMPONENT_CAPTURED'; component: DissectedComponent }
  | { type: 'COPY_CODE'; format: 'css' | 'tailwind' | 'react' | 'tokens' };

export type ExtensionResponse =
  | { success: true; state?: InspectorState }
  | { success: false; error: string };
