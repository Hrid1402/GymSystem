import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PATHS } from '../../routes/paths';
import '../../styles/users.css';
import UserDropdown from '../common/UserDropdown';

export default function DashboardLayout({ title, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    {
      name: 'Inicio',
      path: PATHS.INICIO,
      roles: ['MANAGER', 'RECEPTIONIST', 'CLIENT'],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        </svg>
      ),
    },
    {
      name: 'Usuarios',
      path: PATHS.USERS,
      roles: ['MANAGER'], // Solo visible para Gerente
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
    },
    {
      name: 'Clientes',
      path: PATHS.CLIENTS,
      roles: ['MANAGER', 'RECEPTIONIST'],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
    },
    // Botón para acceso manual
    {
      name: 'Acceso Manual',
      path: PATHS.MANUAL_ACCESS,
      roles: ['MANAGER', 'RECEPTIONIST'],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      ),
    },
    {
      name: user?.role === 'CLIENT' ? 'Mi Membresía' : 'Membresías',
      path: PATHS.MEMBERSHIPS,
      roles: ['MANAGER', 'RECEPTIONIST', 'CLIENT'],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ),
    },
    {
      name: 'Planes',
      path: PATHS.PLANS_ADMIN,
      roles: ['MANAGER'], // Solo visible para Gerente
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      ),
    },
  ];

  // Filtrar ítems según el rol del usuario
  const visibleNavItems = navItems.filter((item) =>
    user?.role ? item.roles.includes(user.role) : false
  );

  return (
    <div className="users-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <span className="brand-title">GymStark</span>
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="nav-item logout-btn" onClick={logout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Cerrar sesión</span>
          </button>
          <div className="sidebar-legal-links">
            <Link to={PATHS.TERMS} target="_blank">Términos del Servicio</Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header">
          <h1 className="page-title">{title}</h1>
          <UserDropdown />
        </header>

        {children}
      </main>
    </div>
  );
}
