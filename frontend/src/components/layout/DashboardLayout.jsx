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
      roles: ['CLIENT'],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        </svg>
      ),
    },
    {
      name: 'Estadísticas',
      path: PATHS.STATS,
      roles: ['MANAGER'], // Solo visible para Gerente
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9"></rect>
          <rect x="14" y="3" width="7" height="5"></rect>
          <rect x="14" y="12" width="7" height="9"></rect>
          <rect x="3" y="16" width="7" height="5"></rect>
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
    // Botón para control de acceso (Recepcionista y Gerente)
    {
      name: 'Control de Acceso',
      path: PATHS.MANUAL_ACCESS,
      roles: ['MANAGER', 'RECEPTIONIST'],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
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
    {
      name: 'Reconocimiento Facial',
      path: PATHS.FACIAL_MANAGEMENT, // Asegúrate de tener esta ruta definida en PATHS
      roles: ['MANAGER', 'RECEPTIONIST'],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 3H5a2 2 0 0 0-2 2v4m16-6h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4m16 4h4a2 2 0 0 0 2-2v-4"></path>
          <circle cx="12" cy="11" r="3"></circle>
          <path d="M6.5 19.5c1.5-1.5 3.5-2.5 5.5-2.5s4 1 5.5 2.5"></path>
        </svg>
      ),
    },
    {
      name: 'Acceso',
      path: PATHS.FACIAL_ACCESS, // Asegúrate de tener esta ruta definida en PATHS
      roles: ['MANAGER', 'RECEPTIONIST'],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v4m0 6v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4m0-6V5a2 2 0 0 1 2-2h4"></path>
          <circle cx="12" cy="12" r="2"></circle>
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2"></path>
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
        <Link to="/" className="sidebar-brand" style={{ textDecoration: 'none' }}>
          <div className="brand-logo-icon">
            <span style={{ fontSize: '1.35rem', fontWeight: 700, lineHeight: 1 }}>+</span>
          </div>
          <span className="brand-title">GymStark</span>
        </Link>

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
