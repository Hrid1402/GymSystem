import { useState } from 'react';
import { usersApi } from '../api/usersApi';
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
    role: 'CLIENT',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
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
          <label htmlFor="role">Rol de Usuario *</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="CLIENT">Cliente</option>
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
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? 'input-error' : ''}
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Repetir contraseña"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={errors.confirmPassword ? 'input-error' : ''}
          />
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
        </div>
      </div>

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
