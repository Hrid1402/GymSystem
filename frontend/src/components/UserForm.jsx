import { useState } from 'react';
import { usersApi } from '../api/usersApi';
import PasswordInput from './common/PasswordInput';
import '../styles/userForm.css';

/**
 * Reusable User Creation Form Component
 * Form fields: Nombres, Apellidos, DNI, Correo, Contraseña, Confirmación de contraseña y Rol.
 */
export default function UserForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dni: '',
    email: '',
    role: 'RECEPTIONIST',
    password: '',
    confirmPassword: '',
    phone: '',
    date_of_birth: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (name === 'first_name' || name === 'last_name') {
      sanitizedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '');
    } else if (name === 'dni') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 8);
    } else if (name === 'phone') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 9);
      if (sanitizedValue.length > 0 && sanitizedValue[0] !== '9') {
        setErrors((prev) => ({ ...prev, phone: 'El teléfono debe iniciar con 9' }));
      }
    } else if (name === 'date_of_birth') {
      if (value && value > today) {
        setErrors((prev) => ({ ...prev, date_of_birth: 'La fecha de nacimiento no puede ser una fecha futura' }));
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    if (errors[name] && (name !== 'phone' || (sanitizedValue.length === 0 || sanitizedValue[0] === '9'))) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'El nombre es obligatorio';
    if (!formData.last_name.trim()) newErrors.last_name = 'El apellido es obligatorio';
    
    if (!formData.dni.trim()) {
      newErrors.dni = 'El DNI es obligatorio';
    } else if (!/^\d{8}$/.test(formData.dni.trim())) {
      newErrors.dni = 'El DNI debe tener 8 dígitos numéricos';
    } else if (formData.dni.trim() === '00000000') {
      newErrors.dni = 'El número de DNI no es válido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Ingrese un correo electrónico válido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (formData.phone && !/^9\d{8}$/.test(formData.phone.trim())) {
      newErrors.phone = 'El teléfono debe iniciar con 9 y tener 9 dígitos';
    }

    if (formData.date_of_birth) {
      if (formData.date_of_birth > today) {
        newErrors.date_of_birth = 'La fecha de nacimiento no puede ser una fecha futura';
      } else if (formData.date_of_birth < '1920-01-01') {
        newErrors.date_of_birth = 'Ingrese una fecha de nacimiento válida';
      }
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
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        phone: formData.phone.trim() || undefined,
        date_of_birth: formData.date_of_birth || undefined,
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

        <div className="form-group">
          <label htmlFor="role">Rol de Personal *</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="RECEPTIONIST">Recepcionista</option>
            <option value="MANAGER">Gerente</option>
          </select>
        </div>
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
          <label htmlFor="date_of_birth">Fecha de Nacimiento (Opcional)</label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            max={today}
            min="1920-01-01"
            value={formData.date_of_birth}
            onChange={handleChange}
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
