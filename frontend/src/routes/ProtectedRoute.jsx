import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PATHS } from './paths';
import Loader from '../components/common/Loader';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen text="Verificando acceso..." />;
  }

  if (!token || !user) {
    return <Navigate to={PATHS.LOGIN} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <h2>Acceso restringido</h2>
        <p style={{ color: '#dc2626', margin: '12px 0 20px' }}>
          No tienes permisos para acceder a esta sección.
        </p>
        <a href={PATHS.HOME} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>
          Volver al inicio
        </a>
      </div>
    );
  }

  return <Outlet />;
}
