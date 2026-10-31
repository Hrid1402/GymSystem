import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { usersApi } from '../api/usersApi';
import { useAuth } from '../context/AuthContext';
import {
  getEighteenYearsAgoDate,
  validateDateOfBirth,
  validateDni,
  validatePhone,
  validateName,
  sanitizeLettersOnly,
  sanitizeDigitsOnly,
} from '../utils/validators';
import '../styles/userModal.css';
import '../styles/userForm.css';

/**
 * UserEditModal Component
 * Allows managers (and authorized staff) to edit existing users (personal info, role, active status).
 */
export default function UserEditModal({ isOpen, onClose, user, onUserUpdated }) {
  const { user: currentUser } = useAuth();
  const maxBirthDate = getEighteenYearsAgoDate();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dni: '',
    phone: '',
    date_of_birth: '',
    role: 'CLIENT',
    is_active: true,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const isManager = currentUser?.role === 'MANAGER';
  const isSelf = currentUser?.id === user?.id;
  // A manager cannot change their own role or deactivate their own account
  const canEditRoleAndStatus = isManager && !isSelf;

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        dni: user.dni || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth ? String(user.date_of_birth).split('T')[0] : '',
        role: user.role || 'CLIENT',
        is_active: user.is_active !== false,
      });
      setErrors({});
      setApiError('');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let sanitizedValue = value;

    if (type === 'checkbox') {
      sanitizedValue = checked;
    } else if (name === 'first_name' || name === 'last_name') {
      sanitizedValue = sanitizeLettersOnly(value);
    } else if (name === 'dni') {
      sanitizedValue = sanitizeDigitsOnly(value, 8);
    } else if (name === 'phone') {
      sanitizedValue = sanitizeDigitsOnly(value, 9);
      if (sanitizedValue.length > 0 && sanitizedValue[0] !== '9') {
        setErrors((prev) => ({ ...prev, phone: 'El teléfono debe iniciar con 9' }));
      }
    } else if (name === 'date_of_birth') {
      const dobErr = value ? validateDateOfBirth(value) : '';
      setErrors((prev) => ({ ...prev, date_of_birth: dobErr }));
    }

    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    if (errors[name] && name !== 'date_of_birth' && (name !== 'phone' || (sanitizedValue.length === 0 || sanitizedValue[0] === '9'))) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};

    const firstNameErr = validateName(formData.first_name, 'El nombre');
    if (firstNameErr) newErrors.first_name = firstNameErr;

    const lastNameErr = validateName(formData.last_name, 'El apellido');
    if (lastNameErr) newErrors.last_name = lastNameErr;

    const dniErr = validateDni(formData.dni);
    if (dniErr) newErrors.dni = dniErr;

    const phoneErr = validatePhone(formData.phone, false);
    if (phoneErr) newErrors.phone = phoneErr;

    if (formData.date_of_birth) {
      const dobErr = validateDateOfBirth(formData.date_of_birth, false);
      if (dobErr) newErrors.date_of_birth = dobErr;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        dni: formData.dni.trim(),
        phone: formData.phone.trim() || null,
        date_of_birth: formData.date_of_birth ? formData.date_of_birth.trim() : null,
      };

      if (canEditRoleAndStatus) {
        payload.role = formData.role;
        payload.is_active = Boolean(formData.is_active);
      }

      const response = await usersApi.updateUser(user.id, payload);
      const updatedUser = response?.user || { ...user, ...payload };

      toast.success('Usuario actualizado correctamente');
      if (onUserUpdated) {
        onUserUpdated(updatedUser);
      }
      onClose();
    } catch (err) {
      const errorMsg = err.message || 'Error al actualizar el usuario';
      setApiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container" 
        style={{ maxWidth: '580px' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Editar Usuario</h2>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar modal">
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '82vh', overflowY: 'auto' }}>
          <form onSubmit={handleSubmit} className="user-form">
            {apiError && <div className="form-alert error">{apiError}</div>}

            {/* Email (Readonly reference) */}
            <div className="form-group" style={{ opacity: 0.85 }}>
              <label>Correo Electrónico (Identificador de acceso)</label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
              />
            </div>

            {/* Nombres y Apellidos */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit_first_name">Nombres *</label>
                <input
                  id="edit_first_name"
                  name="first_name"
                  type="text"
                  placeholder="Ej. Ana María"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={errors.first_name ? 'input-error' : ''}
                />
                {errors.first_name && <span className="error-text">{errors.first_name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="edit_last_name">Apellidos *</label>
                <input
                  id="edit_last_name"
                  name="last_name"
                  type="text"
                  placeholder="Ej. Pérez Gómez"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={errors.last_name ? 'input-error' : ''}
                />
                {errors.last_name && <span className="error-text">{errors.last_name}</span>}
              </div>
            </div>

            {/* DNI y Teléfono */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit_dni">DNI / Documento *</label>
                <input
                  id="edit_dni"
                  name="dni"
                  type="text"
                  maxLength="8"
                  placeholder="12345678"
                  value={formData.dni}
                  onChange={handleChange}
                  className={errors.dni ? 'input-error' : ''}
                />
                {errors.dni && <span className="error-text">{errors.dni}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="edit_phone">Teléfono / Celular</label>
                <input
                  id="edit_phone"
                  name="phone"
                  type="tel"
                  maxLength="9"
                  placeholder="987654321"
                  value={formData.phone}
                  onChange={handleChange}
                  className={errors.phone ? 'input-error' : ''}
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
            </div>

            {/* Fecha de Nacimiento */}
            <div className="form-group">
              <label htmlFor="edit_date_of_birth">Fecha de Nacimiento</label>
              <input
                id="edit_date_of_birth"
                name="date_of_birth"
                type="date"
                max={maxBirthDate}
                value={formData.date_of_birth}
                onChange={handleChange}
                className={errors.date_of_birth ? 'input-error' : ''}
              />
              {errors.date_of_birth && <span className="error-text">{errors.date_of_birth}</span>}
            </div>

            {/* Rol y Estado de Cuenta (Solo si es Manager y no es su propia cuenta) */}
            {canEditRoleAndStatus && (
              <div 
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginTop: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="edit_role" style={{ fontWeight: 600 }}>Rol del Usuario</label>
                    <select
                      id="edit_role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="CLIENT">Cliente</option>
                      <option value="RECEPTIONIST">Recepcionista</option>
                      <option value="MANAGER">Gerente</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="edit_is_active" style={{ fontWeight: 600 }}>Estado de la Cuenta</label>
                    <select
                      id="edit_is_active"
                      name="is_active"
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.value === 'true' }))}
                    >
                      <option value="true">Activa (Habilitada)</option>
                      <option value="false">Inactiva (Suspendida)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#1769e0',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
