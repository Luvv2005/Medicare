import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/theme.css';
import './styles/queue.css';
import './styles/chat.css';
import App from './App.jsx';
import { PrefsProvider } from './context/PrefsContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { CallProvider } from './context/CallContext.jsx';
import { CartProvider } from './context/CartContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PrefsProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <CallProvider>
                <CartProvider>
                  <App />
                </CartProvider>
              </CallProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </PrefsProvider>
    </BrowserRouter>
  </React.StrictMode>
);