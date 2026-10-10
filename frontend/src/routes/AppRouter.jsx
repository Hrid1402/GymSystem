import { Routes, Route } from 'react-router-dom';
import { PATHS } from './paths';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Users from '../pages/Users';
import ProtectedRoute from './ProtectedRoute';

/**
 * Main Application Router
 * Centralizes public and protected route definitions.
 */
export default function AppRouter() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path={PATHS.HOME} element={<Landing />} />
      <Route path={PATHS.LOGIN} element={<Login />} />
      <Route path={PATHS.REGISTER} element={<Register />} />

      {/* Protected Routes (Backoffice screens) */}
      <Route element={<ProtectedRoute />}>
        <Route path={PATHS.USERS} element={<Users />} />
      </Route>
    </Routes>
  );
}
