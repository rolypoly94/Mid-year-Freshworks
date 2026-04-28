import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DemoProvider } from './context/DemoContext';
import { IS_DEMO_MODE } from './lib/demo-mode';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {IS_DEMO_MODE ? (
      <DemoProvider>
        <App />
      </DemoProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
