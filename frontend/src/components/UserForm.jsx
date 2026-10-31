import { useState } from 'react';
import { usersApi } from '../api/usersApi';
import PasswordInput from './common/PasswordInput';
import {
  getEighteenYearsAgoDate,
  validateDateOfBirth,
  validateDni,
  validatePhone,
  validateEmail,
  validatePassword,
  validateName,
  sanitizeLettersOnly,
  sanitizeDigitsOnly,
} from '../utils/validators';
import '../styles/userForm.css';

/**
 * Reusable User Creation Form Component
 * Form fields: Nombres, Apellidos, DNI, Correo, Contraseña, Confirmación de contraseña y Rol.
 */
export default function UserForm({ 
  onSuccess, 
  onCancel, 
  defaultRole = 'RECEPTIONIST', 
  allowedRoles = ['RECEPTIONIST', 'MANAGER'] 
}) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dni: '',
    email: '',
    role: defaultRole,
    password: '',
    confirmPassword: '',
    phone: '',
    date_of_birth: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const maxBirthDate = getEighteenYearsAgoDate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (name === 'first_name' || name === 'last_name') {
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

    const emailErr = validateEmail(formData.email);
    if (emailErr) newErrors.email = emailErr;

    const passErr = validatePassword(formData.password);
    if (passErr) newErrors.password = passErr;

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    const phoneErr = validatePhone(formData.phone, false);
    if (phoneErr) newErrors.phone = phoneErr;

    const dobErr = validateDateOfBirth(formData.date_of_birth, true);
    if (dobErr) newErrors.date_of_birth = dobErr;

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
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        phone: formData.phone.trim() || undefined,
        date_of_birth: formData.date_of_birth.trim(),
      };

      const result = await usersApi.createUser(payload);
      if (onSuccess) {
        onSuccess(result?.user || payload);
      }
    } catch (err) {
      setApiError(err.message || 'Error al guardar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="user-form">
      {apiError && <div className="form-alert error">{apiError}</div>}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="first_name">Nombres *</label>
          <input
            id="first_name"
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
          <label htmlFor="last_name">Apellidos *</label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            placeholder="Ej. Rodríguez Pérez"
            value={formData.last_name}
            onChange={handleChange}
            className={errors.last_name ? 'input-error' : ''}
          />
          {errors.last_name && <span className="error-text">{errors.last_name}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="dni">DNI *</label>
          <input
            id="dni"
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

        {allowedRoles.length > 1 ? (
          <div className="form-group">
            <label htmlFor="role">Rol del Usuario *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              {allowedRoles.includes('CLIENT') && <option value="CLIENT">Cliente</option>}
              {allowedRoles.includes('RECEPTIONIST') && <option value="RECEPTIONIST">Recepcionista</option>}
              {allowedRoles.includes('MANAGER') && <option value="MANAGER">Gerente</option>}
            </select>
          </div>
        ) : (
          <div className="form-group" style={{ display: 'none' }}>
            <input type="hidden" name="role" value={formData.role} />
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="email">Correo Electrónico *</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="ejemplo@gymflow.com"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? 'input-error' : ''}
        />
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="password">Contraseña *</label>
          <PasswordInput
            id="password"
            name="password"
            placeholder="Mínimo 8 caracteres"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? 'input-error' : ''}
            autoComplete="new-password"
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Repetir contraseña"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={errors.confirmPassword ? 'input-error' : ''}
            autoComplete="new-password"
          />
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="phone">Teléfono (Opcional)</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            maxLength="9"
            placeholder="912345678"
            value={formData.phone}
            onChange={handleChange}
            className={errors.phone ? 'input-error' : ''}
          />
          {errors.phone && <span className="error-text">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="date_of_birth">Fecha de Nacimiento *</label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            max={maxBirthDate}
            min="1900-01-01"
            value={formData.date_of_birth}
            onChange={handleChange}
            required
            className={errors.date_of_birth ? 'input-error' : ''}
          />
          {errors.date_of_birth && <span className="error-text">{errors.date_of_birth}</span>}
        </div>
      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : 'Crear Usuario'}
        </button>
      </div>
    </form>
  );
}
