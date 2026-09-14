import React from 'react';
import { createRoot } from 'react-dom/client';
import Catalog from './components/CatalogApp';
import { ThemeProvider } from './components/ThemeProvider';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><ThemeProvider><Catalog /></ThemeProvider></React.StrictMode>);
