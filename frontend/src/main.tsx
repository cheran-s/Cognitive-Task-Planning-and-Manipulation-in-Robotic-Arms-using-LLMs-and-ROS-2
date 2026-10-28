import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppContent } from './App';
import { RobotProvider } from './context/RobotContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="Cognitive Manipulation Studio Guard">
      <RobotProvider>
        <AppContent />
      </RobotProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

