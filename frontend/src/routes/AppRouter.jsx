import { Route, Routes } from 'react-router-dom';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Profile from '../pages/Profile';
import Register from '../pages/Register';
import Users from '../pages/Users';
import AccesoManual from '../pages/dashboard/AccesoManual';
import Clientes from '../pages/dashboard/Clientes';
import Estadisticas from '../pages/dashboard/Estadisticas';
import Inicio from '../pages/dashboard/Inicio';
import Membresias from '../pages/dashboard/Membresias';
import PlanesAdmin from '../pages/dashboard/PlanesAdmin';
import ProtectedRoute from './ProtectedRoute';
import { PATHS } from './paths';

export default function AppRouter() {
  return (
    <Routes>
      {/* Rutas publicas */}
      <Route path={PATHS.HOME} element={<Landing />} />
      <Route path={PATHS.LOGIN} element={<Login />} />
      <Route path={PATHS.REGISTER} element={<Register />} />

      {/* Perfil de usuario (Accesible por cualquier usuario autenticado) */}
      <Route element={<ProtectedRoute />}>
        <Route path={PATHS.PROFILE} element={<Profile />} />
      </Route>

      {/* Modulos del panel administrativo (Gerente y Recepcionista) */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'RECEPTIONIST']} />}>
        <Route path={PATHS.USERS} element={<Users />} />
        <Route path={PATHS.INICIO} element={<Inicio />} />
        <Route path={PATHS.CLIENTS} element={<Clientes />} />
        <Route path={PATHS.MEMBERSHIPS} element={<Membresias />} />
        <Route path={PATHS.PLANS_ADMIN} element={<PlanesAdmin />} />
        <Route path={PATHS.STATS} element={<Estadisticas />} />
        {/* Ruta para acceso manual */}
          <Route path={PATHS.MANUAL_ACCESS} element={<AccesoManual />} />
      </Route>
    </Routes>
  );
}
