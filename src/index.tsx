/**
 * @fileoverview Application entry point
 * This is the main entry file that renders the React application
 * into the DOM and sets up React.StrictMode for development checks.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Create root element and render the application
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Render app with StrictMode enabled for additional development checks
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
