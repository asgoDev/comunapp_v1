import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useUiStore } from './stores/uiStore';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import UsersPage from './pages/Users/UsersPage';
import UserFormPage from './pages/Users/UserFormPage';
import ComunidadesPage from './pages/Comunidades/ComunidadesPage';
import ComunidadFormPage from './pages/Comunidades/ComunidadFormPage';
import ComunidadResumenPage from './pages/Comunidades/ComunidadResumenPage';
import AuditoriaPage from './pages/Auditoria/AuditoriaPage';
import HabitantesPage from './pages/Habitantes/HabitantesPage';
import CasaDetailPage from './pages/Habitantes/CasaDetailPage';
import HabitanteFormPage from './pages/Habitantes/HabitanteFormPage';
import HabitanteDetailPage from './pages/Habitantes/HabitanteDetailPage';

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const sessionExpiry = useAuthStore((s) => s.sessionExpiry);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    if (!isAuthenticated) return;

    const verifySession = async (silent = false) => {
      if (!sessionExpiry || Date.now() > Number(sessionExpiry)) {
        await useAuthStore.getState().logout();
        return;
      }

      checkAuth({ silent });
    };

    verifySession(false);

    const interval = setInterval(() => {
      verifySession(true);
    }, 5 * 60 * 1000);

    const handleFocus = () => {
      verifySession(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkAuth, isAuthenticated]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (isAuthenticated && isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background font-montserrat">
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-16 h-16 rounded-full border-4 border-primary/30 animate-ping"></div>
          <div className="w-16 h-16 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute text-primary">
            <span className="material-symbols-outlined text-3xl font-bold fill-icon">shield_lock</span>
          </div>
        </div>
        <h2 className="text-headline-sm text-on-surface mb-2 animate-pulse">Verificando sesión</h2>
        <p className="text-body-sm text-on-surface-variant max-w-xs text-center">
          Por favor espere un momento mientras validamos sus credenciales de seguridad...
        </p>
      </div>
    );
  }


  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="usuarios" element={<UsersPage />} />
          <Route path="usuarios/nuevo" element={<UserFormPage />} />
          <Route path="usuarios/:id" element={<UserFormPage />} />
          <Route path="comunidades" element={<ComunidadesPage />} />
          <Route path="comunidades/nueva" element={<ComunidadFormPage />} />
          <Route path="comunidades/:id" element={<ComunidadFormPage />} />
          <Route path="comunidades/:id/resumen" element={<ComunidadResumenPage />} />
          <Route path="habitantes" element={<HabitantesPage />} />
          <Route path="habitantes/nuevo" element={<HabitanteFormPage />} />
          <Route path="habitantes/casa/:numero" element={<CasaDetailPage />} />
          <Route path="habitantes/:id" element={<HabitanteDetailPage />} />
          <Route path="habitantes/:id/editar" element={<HabitanteFormPage />} />
          <Route path="auditoria" element={<AuditoriaPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
