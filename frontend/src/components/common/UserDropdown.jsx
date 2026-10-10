import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { PATHS } from '../../routes/paths';
import '../../styles/userDropdown.css';

export default function UserDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const getInitials = (first, last) => {
    const f = first ? first.charAt(0).toUpperCase() : '';
    const l = last ? last.charAt(0).toUpperCase() : '';
    return `${f}${l}` || 'U';
  };

  const getRoleLabel = (role) => {
    if (role === 'MANAGER') return 'Gerente';
    if (role === 'RECEPTIONIST') return 'Recepcionista';
    return '';
  };

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario';
  const roleLabel = getRoleLabel(user.role);
  const initials = getInitials(user.first_name, user.last_name);

  const handleProfileClick = () => {
    setIsOpen(false);
    navigate(PATHS.PROFILE);
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    logout();
    toast.info('Sesión cerrada correctamente');
    navigate(PATHS.LOGIN);
  };

  return (
    <div className="user-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className="user-profile-badge"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="user-avatar-circle">{initials}</div>
        <div className="user-info">
          <span className="user-name">{fullName}</span>
          {roleLabel && <span className="user-role">{roleLabel}</span>}
        </div>
        <svg
          className={`chevron-icon ${isOpen ? 'rotate' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <span className="dropdown-email">{user.email}</span>
          </div>

          <button
            type="button"
            className="dropdown-item"
            onClick={handleProfileClick}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Editar información</span>
          </button>

          <div className="dropdown-divider"></div>

          <button
            type="button"
            className="dropdown-item text-danger"
            onClick={handleLogoutClick}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}
