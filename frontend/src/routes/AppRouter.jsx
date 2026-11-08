import { Route, Routes } from 'react-router-dom';
import ForgotPassword from '../pages/ForgotPassword';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Profile from '../pages/Profile';
import Register from '../pages/Register';
import ResetPassword from '../pages/ResetPassword';
import Users from '../pages/Users';
import Acceso from '../pages/dashboard/Acceso';
import AccesoManual from '../pages/dashboard/AccesoManual';
import Clientes from '../pages/dashboard/Clientes';
import ControlFacial from '../pages/dashboard/ControlFacial';
import Estadisticas from '../pages/dashboard/Estadisticas';
import Inicio from '../pages/dashboard/Inicio';
import Membresias from '../pages/dashboard/Membresias';
import PlanesAdmin from '../pages/dashboard/PlanesAdmin';
import LibroReclamaciones from '../pages/legal/LibroReclamaciones';
import PoliticaPrivacidad from '../pages/legal/PoliticaPrivacidad';
import TerminosYCondiciones from '../pages/legal/TerminosYCondiciones';
import ProtectedRoute from './ProtectedRoute';
import { PATHS } from './paths';

export default function AppRouter() {
  return (
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

      {/* Modulos compartidos (Gerente, Recepcionista y Cliente) */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'RECEPTIONIST', 'CLIENT']} />}>
        <Route path={PATHS.INICIO} element={<Inicio />} />
        <Route path={PATHS.MEMBERSHIPS} element={<Membresias />} />
      </Route>

      {/* Modulos del panel administrativo (Gerente y Recepcionista) */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'RECEPTIONIST']} />}>
        <Route path={PATHS.CLIENTS} element={<Clientes />} />
        <Route path={PATHS.STATS} element={<Estadisticas />} />
        <Route path={PATHS.MANUAL_ACCESS} element={<AccesoManual />} />
      </Route>

      {/* Modulos exclusivos del Gerente */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
        <Route path={PATHS.USERS} element={<Users />} />
        <Route path={PATHS.PLANS_ADMIN} element={<PlanesAdmin />} />
      </Route>
      
      {/* Modulos exclusivos de la Recepcionista */}
      <Route element={<ProtectedRoute allowedRoles={['RECEPTIONIST']} />}>
        <Route path={PATHS.FACIAL_MANAGEMENT} element={<ControlFacial />} />
        <Route path={PATHS.FACIAL_ACCESS} element={<Acceso />} />
      </Route>
    </Routes>
  );
}
