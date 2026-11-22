import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Loader from '../components/common/Loader';
import ProtectedRoute from './ProtectedRoute';
import { PATHS } from './paths';

// Vistas públicas y autenticación
const Landing = lazy(() => import('../pages/Landing'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const Profile = lazy(() => import('../pages/Profile'));
const Users = lazy(() => import('../pages/Users'));

// Módulos compartidos y dashboard
const Inicio = lazy(() => import('../pages/dashboard/Inicio'));
const Membresias = lazy(() => import('../pages/dashboard/Membresias'));
const Clases = lazy(() => import('../pages/dashboard/Clases'));
const Clientes = lazy(() => import('../pages/dashboard/Clientes'));
const Estadisticas = lazy(() => import('../pages/dashboard/Estadisticas'));
const PlanesAdmin = lazy(() => import('../pages/dashboard/PlanesAdmin'));
const Entrenadores = lazy(() => import('../pages/dashboard/Entrenadores'));
const AccesoManual = lazy(() => import('../pages/dashboard/AccesoManual'));

// Módulos especializados de hardware (Cámaras, IA Facial, Escáner QR)
const Acceso = lazy(() => import('../pages/dashboard/Acceso'));
const ControlFacial = lazy(() => import('../pages/dashboard/ControlFacial'));
const EscanerQr = lazy(() => import('../pages/dashboard/EscanerQr'));

// Páginas legales
const LibroReclamaciones = lazy(() => import('../pages/legal/LibroReclamaciones'));
const PoliticaPrivacidad = lazy(() => import('../pages/legal/PoliticaPrivacidad'));
const TerminosYCondiciones = lazy(() => import('../pages/legal/TerminosYCondiciones'));

export default function AppRouter() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Loader text="Cargando..." />
        </div>
      }
    >
      <Routes>
        {/* Rutas publicas */}
        <Route path={PATHS.HOME} element={<Landing />} />
        <Route path={PATHS.LOGIN} element={<Login />} />
        <Route path={PATHS.REGISTER} element={<Register />} />
        <Route path={PATHS.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={PATHS.RESET_PASSWORD} element={<ResetPassword />} />
        <Route path={PATHS.TERMS} element={<TerminosYCondiciones />} />
        <Route path={PATHS.PRIVACY} element={<PoliticaPrivacidad />} />
        <Route path={PATHS.COMPLAINTS} element={<LibroReclamaciones />} />

        {/* Perfil de usuario (Accesible por cualquier usuario autenticado) */}
        <Route element={<ProtectedRoute />}>
          <Route path={PATHS.PROFILE} element={<Profile />} />
        </Route>

        {/* Modulos compartidos */}
        <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'RECEPTIONIST', 'CLIENT', 'TRAINER']} />}>
          <Route path={PATHS.INICIO} element={<Inicio />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'RECEPTIONIST', 'CLIENT']} />}>
          <Route path={PATHS.MEMBERSHIPS} element={<Membresias />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'CLIENT', 'TRAINER']} />}>
          <Route path={PATHS.CLASSES} element={<Clases />} />
        </Route>

        {/* Modulos del panel administrativo (Gerente y Recepcionista) */}
        <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'RECEPTIONIST']} />}>
          <Route path={PATHS.CLIENTS} element={<Clientes />} />
          <Route path={PATHS.STATS} element={<Estadisticas />} />
          <Route path={PATHS.MANUAL_ACCESS} element={<AccesoManual />} />
        </Route>

        {/* Modulos exclusivos del Entrenador */}
        <Route element={<ProtectedRoute allowedRoles={['TRAINER']} />}>
          <Route path={PATHS.TRAINER_SCANNER} element={<EscanerQr />} />
        </Route>

        {/* Modulos exclusivos del Gerente */}
        <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
          <Route path={PATHS.USERS} element={<Users />} />
          <Route path={PATHS.TRAINERS} element={<Entrenadores />} />
          <Route path={PATHS.PLANS_ADMIN} element={<PlanesAdmin />} />
        </Route>

        {/* Modulos exclusivos de la Recepcionista */}
        <Route element={<ProtectedRoute allowedRoles={['RECEPTIONIST']} />}>
          <Route path={PATHS.FACIAL_MANAGEMENT} element={<ControlFacial />} />
          <Route path={PATHS.FACIAL_ACCESS} element={<Acceso />} />
        </Route>
      </Routes>
    </Suspense>
  );
}