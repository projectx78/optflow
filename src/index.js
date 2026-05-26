import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import AuthPage from './pages/AuthPage';
import { useAuth } from './context/AuthContext';

function Root() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#030303", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"#39FF14", fontFamily:"monospace", fontSize:12, letterSpacing:2 }}>LOADING…</div>
    </div>
  );
  return user ? <App /> : <AuthPage />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <Root />
  </AuthProvider>
);
