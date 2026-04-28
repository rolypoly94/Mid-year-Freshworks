import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DemoPerspective, DEMO_PERSPECTIVES } from '../lib/demo-data';

interface DemoContextType {
  perspective: DemoPerspective;
  setPerspective: (p: DemoPerspective) => void;
  activeProfile: typeof DEMO_PERSPECTIVES['admin'];
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [perspective, setPerspective] = useState<DemoPerspective>('admin');

  const activeProfile = DEMO_PERSPECTIVES[perspective];

  return (
    <DemoContext.Provider value={{ perspective, setPerspective, activeProfile }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
