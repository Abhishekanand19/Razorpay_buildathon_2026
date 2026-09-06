import React from 'react';
import { createRoot } from 'react-dom/client';
import { NourNovaPage } from './NourNovaPage.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><NourNovaPage /></React.StrictMode>,
);
