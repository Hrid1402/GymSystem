import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PATHS } from '../routes/paths';
import UserDropdown from '../components/common/UserDropdown';
import '../styles/profile.css';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const isStaff = user.role === 'MANAGER' || user.role === 'RECEPTIONIST';

  const getRoleLabel = (role) => {
    if (role === 'MANAGER') return 'Gerente';
    if (role === 'RECEPTIONIST') return 'Recepcionista';
    return '';
  };

  const getInitials = (first, last) => {
    const f = first ? first.charAt(0).toUpperCase() : '';
    const l = last ? last.charAt(0).toUpperCase() : '';
    return `${f}${l}` || 'U';
  };

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario';
  const roleLabel = getRoleLabel(user.role);
  const initials = getInitials(user.first_name, user.last_name);

  return (
    <div className="profile-page">
      <header className="profile-top-bar">
        <div
          className="brand-logo"
          onClick={() => navigate(isStaff ? PATHS.USERS : PATHS.HOME)}
          style={{ cursor: 'pointer' }}
        >
          <span className="logo-symbol">+</span>
          <span className="logo-text">GymStark</span>
        </div>

        <div className="top-bar-actions">
          {isStaff && (
            <button
              type="button"
              className="btn-back-nav"
              onClick={() => navigate(PATHS.USERS)}
            >
              Panel de administración
            </button>
          )}
          <UserDropdown />
        </div>
      </header>

      <main className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar-big">{initials}</div>
            <div className="profile-titles">
              <h1>{fullName}</h1>
              <div className="profile-badges">
                {roleLabel && <span className="badge-role">{roleLabel}</span>}
                <span className="badge-status">Cuenta activa</span>
              </div>
            </div>
          </div>

          <div className="info-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>
              Vista de solo lectura. La modificación de datos personales estará disponible próximamente.
            </span>
          </div>

          <div className="profile-form-grid">
            <div className="profile-field">
              <label>Nombres</label>
              <input type="text" value={user.first_name || ''} readOnly disabled />
            </div>

            <div className="profile-field">
              <label>Apellidos</label>
              <input type="text" value={user.last_name || ''} readOnly disabled />
            </div>

            <div className="profile-field">
              <label>Documento de Identidad (DNI)</label>
              <input type="text" value={user.dni || ''} readOnly disabled />
            </div>

            {roleLabel && (
              <div className="profile-field">
                <label>Cargo / Rol</label>
                <input type="text" value={roleLabel} readOnly disabled />
              </div>
            )}

            <div className={`profile-field ${!roleLabel ? '' : 'full-width'}`}>
              <label>Correo Electrónico</label>
              <input type="email" value={user.email || ''} readOnly disabled />
            </div>

            <div className="profile-field">
              <label>Teléfono</label>
              <input
                type="text"
                value={user.phone || 'No registrado'}
                readOnly
                disabled
              />
            </div>

            <div className="profile-field">
              <label>Fecha de Nacimiento</label>
              <input
                type="text"
                value={user.date_of_birth || 'No registrada'}
                readOnly
                disabled
              />
            </div>
          </div>

          <div className="profile-actions">
            <button
              type="button"
              className="btn-back"
              onClick={() => navigate(isStaff ? PATHS.USERS : PATHS.HOME)}
            >
              Volver
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
