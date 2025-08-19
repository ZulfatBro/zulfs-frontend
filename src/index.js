import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App'; // App.jsx у тебя в canvas — положи как src/App.jsx

const container = document.getElementById('root');
createRoot(container).render(<App />);
