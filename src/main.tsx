import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/base.css';
import './styles/glass.css';
import './styles/shell.css';
import './styles/components.css';
import { App } from './App.tsx';
import { AppProvider } from './app/AppProvider.tsx';
import { readSession } from './app/session.ts';
import { paletteCss } from './ui/palette.ts';

const style = document.createElement('style');
style.dataset.cadence = 'palette';
style.textContent = paletteCss();
document.head.prepend(style);

const session = readSession();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppProvider session={session}>
      <App />
    </AppProvider>
  </StrictMode>,
);
