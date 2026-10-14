import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/usersApi';
import { PATHS } from '../routes/paths';
import UserDropdown from '../components/common/UserDropdown';
import PasswordInput from '../components/common/PasswordInput';
import '../styles/profile.css';

export default function Profile() {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  // Estados para datos personales
  const [personalData, setPersonalData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    date_of_birth: user?.date_of_birth ? user.date_of_birth.split('T')[0] : '',
  });
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Estados para cambio de correo electrónico
  const [emailData, setEmailData] = useState({
    new_email: '',
    current_password: '',
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Estados para cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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

  const getEighteenYearsAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  };
  const maxBirthDate = getEighteenYearsAgo();

  // Guardar datos personales
  const handleSavePersonal = async (e) => {
    e.preventDefault();
    if (!personalData.first_name.trim() || !personalData.last_name.trim()) {
      toast.error('Nombres y apellidos son obligatorios');
      return;
    }

    if (personalData.phone && !/^9\d{8}$/.test(personalData.phone)) {
      toast.error('El teléfono debe tener 9 dígitos y empezar con 9');
      return;
    }

    if (personalData.date_of_birth) {
      if (personalData.date_of_birth > maxBirthDate) {
        toast.error('Debes ser mayor de edad (al menos 18 años)');
        return;
      }
      if (personalData.date_of_birth < '1920-01-01') {
        toast.error('Ingrese una fecha de nacimiento válida');
        return;
      }
    }

    setSavingPersonal(true);
    try {
      const payload = {
        first_name: personalData.first_name.trim(),
        last_name: personalData.last_name.trim(),
        phone: personalData.phone.trim() || null,
        date_of_birth: personalData.date_of_birth || null,
      };

      const res = await usersApi.updateUser(user.id, payload);
      if (res?.user) {
        updateUserProfile({ ...user, ...res.user });
        toast.success('Datos personales actualizados correctamente');
      }
    } catch (err) {
      toast.error(err.message || 'Error al actualizar datos personales');
    } finally {
      setSavingPersonal(false);
    }
  };

  // Guardar nuevo correo electrónico
  const handleSaveEmail = async (e) => {
    e.preventDefault();
    if (!emailData.new_email.trim() || !emailData.current_password) {
      toast.error('Ingrese el nuevo correo y su contraseña actual');
      return;
    }

    if (emailData.new_email.trim().toLowerCase() === (user.email || '').toLowerCase().trim()) {
      toast.error('El nuevo correo electrónico debe ser diferente al actual');
      return;
    }

    setSavingEmail(true);
    try {
      const res = await usersApi.changeEmail(user.id, {
        email: emailData.new_email.trim().toLowerCase(),
        current_password: emailData.current_password,
      });

      if (res?.user) {
        updateUserProfile({ ...user, email: res.user.email });
        toast.success('Correo electrónico actualizado correctamente');
        setEmailData({ new_email: '', current_password: '' });
        setShowEmailModal(false);
      }
    } catch (err) {
      toast.error(err.message || 'Error al cambiar correo electrónico');
    } finally {
      setSavingEmail(false);
    }
  };

  // Guardar nueva contraseña
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.current_password || !passwordData.new_password) {
      toast.error('Complete todos los campos');
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setSavingPassword(true);
    try {
      await usersApi.changePassword(user.id, {
        new_password: passwordData.new_password,
        current_password: passwordData.current_password,
      });

      toast.success('Contraseña actualizada con éxito');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswordModal(false);
    } catch (err) {
      toast.error(err.message || 'Error al cambiar contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-top-bar">
        <div
          className="brand-logo"
          onClick={() => navigate(user.role === 'MANAGER' ? PATHS.USERS : user.role === 'RECEPTIONIST' ? PATHS.CLIENTS : PATHS.INICIO)}
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
              onClick={() => navigate(user.role === 'MANAGER' ? PATHS.USERS : PATHS.CLIENTS)}
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

          {/* SECCIÓN 1: DATOS PERSONALES MODIFICABLES */}
          <form onSubmit={handleSavePersonal} className="profile-section-form">
            <div className="section-header-row">
              <h2 className="profile-section-title">Información Personal</h2>
              <span className="section-subtitle">Actualiza tus datos de contacto y perfil</span>
            </div>

            <div className="profile-form-grid">
              <div className="profile-field">
                <label>Nombres *</label>
                <input
                  type="text"
                  maxLength={100}
                  value={personalData.first_name}
                  onChange={(e) => setPersonalData({ ...personalData, first_name: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '') })}
                  placeholder="Nombres"
                  required
                />
              </div>

              <div className="profile-field">
                <label>Apellidos *</label>
                <input
                  type="text"
                  maxLength={100}
                  value={personalData.last_name}
                  onChange={(e) => setPersonalData({ ...personalData, last_name: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '') })}
                  placeholder="Apellidos"
                  required
                />
              </div>

              <div className="profile-field">
                <label>Documento de Identidad (DNI)</label>
                <input
                  type="text"
                  value={user.dni || ''}
                  disabled
                  readOnly
                  title="El DNI no puede ser modificado directamente por seguridad"
                />
                <span className="field-hint">Identificador único no modificable</span>
              </div>

              <div className="profile-field">
                <label>Teléfono (9 dígitos)</label>
                <input
                  type="tel"
                  maxLength={9}
                  value={personalData.phone}
                  onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  placeholder="Ej. 987654321"
                />
              </div>

              <div className="profile-field">
                <label>Fecha de Nacimiento</label>
                <input
                  type="date"
                  max={maxBirthDate}
                  min="1920-01-01"
                  value={personalData.date_of_birth}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val > maxBirthDate) {
                      toast.error('Debes ser mayor de edad (al menos 18 años)');
                      return;
                    }
                    setPersonalData({ ...personalData, date_of_birth: val });
                  }}
                />
              </div>

              {roleLabel && (
                <div className="profile-field">
                  <label>Rol en el Sistema</label>
                  <input type="text" value={roleLabel} disabled readOnly />
                </div>
              )}
            </div>

            <div className="form-submit-row">
              <button
                type="submit"
                className="btn-primary-profile"
                disabled={savingPersonal}
              >
                {savingPersonal ? 'Guardando cambios...' : 'Guardar Datos Personales'}
              </button>
            </div>
          </form>

          {/* SECCIÓN 2: SEGURIDAD Y ACCESO (CORREO Y CONTRASEÑA EN LA PARTE INFERIOR) */}
          <div className="security-section">
            <div className="section-header-row">
              <h2 className="profile-section-title">Seguridad y Credenciales de Acceso</h2>
              <span className="section-subtitle">Gestión de tu correo electrónico y clave de acceso</span>
            </div>

            <div className="security-cards-grid">
              {/* Tarjeta de Correo Electrónico */}
              <div className="security-item-card">
                <div className="security-item-info">
                  <div className="security-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h3 className="security-item-title">Correo Electrónico</h3>
                    <p className="security-item-value">{user.email}</p>
                    <span className="security-item-desc">Utilizado para iniciar sesión y recibir notificaciones.</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary-outline"
                  onClick={() => setShowEmailModal(!showEmailModal)}
                >
                  {showEmailModal ? 'Cancelar' : 'Cambiar Correo'}
                </button>
              </div>

              {/* Formulario desplegable para cambiar Correo */}
              {showEmailModal && (
                <form onSubmit={handleSaveEmail} className="security-subform">
                  <div className="subform-vertical">
                    <div className="profile-field">
                      <label>Contraseña Actual * (para verificar tu identidad)</label>
                      <PasswordInput
                        value={emailData.current_password}
                        onChange={(e) => setEmailData({ ...emailData, current_password: e.target.value })}
                        placeholder="Ingresa tu contraseña actual"
                        required
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="profile-field">
                      <label>Nuevo Correo Electrónico *</label>
                      <input
                        type="email"
                        value={emailData.new_email}
                        onChange={(e) => setEmailData({ ...emailData, new_email: e.target.value })}
                        placeholder="ejemplo@correo.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="subform-actions">
                    <button
                      type="submit"
                      className="btn-primary-profile"
                      disabled={savingEmail}
                    >
                      {savingEmail ? 'Actualizando...' : 'Confirmar Nuevo Correo'}
                    </button>
                  </div>
                </form>
              )}

              {/* Tarjeta de Contraseña */}
              <div className="security-item-card">
                <div className="security-item-info">
                  <div className="security-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="security-item-title">Contraseña</h3>
                    <p className="security-item-value">••••••••••••</p>
                    <span className="security-item-desc">Protege tu cuenta con una clave segura de al menos 8 caracteres.</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary-outline"
                  onClick={() => setShowPasswordModal(!showPasswordModal)}
                >
                  {showPasswordModal ? 'Cancelar' : 'Cambiar Contraseña'}
                </button>
              </div>

              {/* Formulario desplegable para cambiar Contraseña */}
              {showPasswordModal && (
                <form onSubmit={handleSavePassword} className="security-subform">
                  <div className="subform-vertical">
                    <div className="profile-field">
                      <label>Contraseña Actual *</label>
                      <PasswordInput
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        placeholder="Ingresa tu contraseña actual"
                        required
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="profile-field">
                      <label>Nueva Contraseña * (mínimo 8 caracteres)</label>
                      <PasswordInput
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        placeholder="Ingresa tu nueva contraseña"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="profile-field">
                      <label>Confirmar Nueva Contraseña *</label>
                      <PasswordInput
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        placeholder="Repite tu nueva contraseña"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <div className="subform-actions">
                    <button
                      type="submit"
                      className="btn-primary-profile"
                      disabled={savingPassword}
                    >
                      {savingPassword ? 'Cambiando...' : 'Confirmar Nueva Contraseña'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="profile-actions">
            <button
              type="button"
              className="btn-back"
              onClick={() => navigate(user.role === 'MANAGER' ? PATHS.USERS : user.role === 'RECEPTIONIST' ? PATHS.CLIENTS : PATHS.INICIO)}
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
