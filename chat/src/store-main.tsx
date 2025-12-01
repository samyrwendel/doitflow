import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StorePage } from './StorePage';
import './index.css';
import { ThemeProvider } from 'next-themes';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <StorePage />
    </ThemeProvider>
  </StrictMode>
);