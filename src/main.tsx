import React from 'react';
import { createRoot } from 'react-dom/client';
import Catalog from './components/CatalogApp';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Catalog /></React.StrictMode>);
