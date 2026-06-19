import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#eaedff',
              color: '#00174a',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '12px',
              border: '1px solid #becabe30',
            },
            success: {
              iconTheme: { primary: '#006a3b', secondary: '#ffffff' },
            },
            error: {
              iconTheme: { primary: '#ba1a1a', secondary: '#ffffff' },
            },
          }}
        />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
