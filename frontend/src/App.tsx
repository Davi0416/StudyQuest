import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import { UpdateManager } from './components/UpdateManager';
import { Login } from './pages/Login';
import { Hub } from './pages/Hub';
import { Mapa } from './pages/Mapa';
import { Missao } from './pages/Missao';
import { Aula } from './pages/Aula';
import { Revisao } from './pages/Revisao';
import { Ranking } from './pages/Ranking';
import { Conquistas } from './pages/Conquistas';
import { Perfil } from './pages/Perfil';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  if (loading) return <div className="min-h-screen grid place-items-center bg-bg text-text">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <UpdateManager />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
          <Route path="/mapa" element={<ProtectedRoute><Mapa /></ProtectedRoute>} />
          <Route path="/aula/:id" element={<ProtectedRoute><Aula /></ProtectedRoute>} />
          <Route path="/missao/:id" element={<ProtectedRoute><Missao /></ProtectedRoute>} />
          <Route path="/revisao" element={<ProtectedRoute><Revisao /></ProtectedRoute>} />
          <Route path="/conquistas" element={<ProtectedRoute><Conquistas /></ProtectedRoute>} />
          <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}
