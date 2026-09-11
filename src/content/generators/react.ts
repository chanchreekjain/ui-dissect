import type { DissectedComponent } from '../../types';

export function generateReactComponent(comp: DissectedComponent): string {
  const componentName = comp.classification.title
    .replace(/[^a-zA-Z0-9]/g, '')
    .concat('Component');

  const tw = comp.code.tailwind;

  return `import React from 'react';

export interface ${componentName}Props {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Aesthetic: ${comp.classification.title}
 * Traits: ${comp.classification.traits.join(', ')}
 */
export const ${componentName}: React.FC<${componentName}Props> = ({ children, className = '' }) => {
  return (
    <div className={\`${tw} \${className}\`}>
      {children ?? <span>${comp.classification.title}</span>}
    </div>
  );
};
`;
}
