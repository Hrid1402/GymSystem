import { useEffect, useState } from 'react';
import { usersApi } from '../../api/usersApi';
import PasswordInput from '../../components/common/PasswordInput';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import '../../styles/clientes.css';
import '../../styles/entrenadores.css';
import '../../styles/userForm.css';
import '../../styles/userModal.css';
import {
    getEighteenYearsAgoDate,
    sanitizeDigitsOnly,
    sanitizeLettersOnly,
    validateDateOfBirth,
    validateDni,
    validateEmail,
    validateName,
    validatePassword,
    validatePhone,
} from '../../utils/validators';

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  tipo_documento: 'dni',
  numero_documento: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  date_of_birth: '',
  specialty: '',
};

const INITIAL_EDIT_FORM = {
  first_name: '',
  last_name: '',
  tipo_documento: 'dni',
  numero_documento: '',
  phone: '',
  date_of_birth: '',
  specialty: '',
  is_active: true,
};

export default function Entrenadores() {
  const { user: currentUser } = useAuth();
  const canEditTrainers = currentUser?.role === 'MANAGER';

  const [trainers, setTrainers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal Crear
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal Editar
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [editFormData, setEditFormData] = useState(INITIAL_EDIT_FORM);
  const [editErrors, setEditErrors] = useState({});
  const [editApiError, setEditApiError] = useState('');
  const [updating, setUpdating] = useState(false);

  const maxBirthDate = getEighteenYearsAgoDate();

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getUsers();
      const onlyTrainers = (res?.users || []).filter(
        (user) => user.role === 'TRAINER'
      );
      setTrainers(onlyTrainers);
    } catch (error) {
      console.error('Error al cargar los entrenadores:', error);
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${first}${last}` || 'E';
  };

  const openCreateModal = () => {
    setErrors({});
    setApiError('');
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const closeCreateModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
  };

  const openEditModal = (trainer) => {
    setEditErrors({});
    setEditApiError('');
    setEditingTrainer(trainer);
    setEditFormData({
      first_name: trainer.first_name || '',
      last_name: trainer.last_name || '',
      tipo_documento: trainer.tipo_documento || 'dni',
      numero_documento: trainer.numero_documento || '',
      phone: trainer.phone || '',
      date_of_birth: trainer.date_of_birth
        ? String(trainer.date_of_birth).slice(0, 10)
        : '',
      specialty: trainer.specialty || '',
      is_active: trainer.is_active !== false,
    });
  };

  const closeEditModal = () => {
    if (updating) return;
    setEditingTrainer(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (name === 'first_name' || name === 'last_name') {
      sanitizedValue = sanitizeLettersOnly(value);
    } else if (name === 'tipo_documento') {
      setFormData((prev) => ({ ...prev, tipo_documento: value, numero_documento: '' }));
      setErrors((prev) => ({ ...prev, numero_documento: '' }));
      if (apiError) setApiError('');
      return;
    } else if (name === 'numero_documento') {
      if (formData.tipo_documento === 'dni') {
        sanitizedValue = sanitizeDigitsOnly(value, 8);
      } else {
        sanitizedValue = value
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()
          .slice(0, 12);
      }
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
    if (
      errors[name] &&
      name !== 'date_of_birth' &&
      (name !== 'phone' || sanitizedValue.length === 0 || sanitizedValue[0] === '9')
    ) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    let nextVal = type === 'checkbox' ? checked : value;

    if (name === 'first_name' || name === 'last_name') {
      nextVal = sanitizeLettersOnly(value);
    } else if (name === 'tipo_documento') {
      setEditFormData((prev) => ({ ...prev, tipo_documento: value, numero_documento: '' }));
      setEditErrors((prev) => ({ ...prev, numero_documento: '' }));
      if (editApiError) setEditApiError('');
      return;
    } else if (name === 'numero_documento') {
      if (editFormData.tipo_documento === 'dni') {
        nextVal = sanitizeDigitsOnly(value, 8);
      } else {
        nextVal = value
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()
          .slice(0, 12);
      }
    } else if (name === 'phone') {
      nextVal = sanitizeDigitsOnly(value, 9);
      if (nextVal.length > 0 && nextVal[0] !== '9') {
        setEditErrors((prev) => ({ ...prev, phone: 'El teléfono debe iniciar con 9' }));
      }
    } else if (name === 'date_of_birth') {
      const dobErr = value ? validateDateOfBirth(value) : '';
      setEditErrors((prev) => ({ ...prev, date_of_birth: dobErr }));
    }

    setEditFormData((prev) => ({ ...prev, [name]: nextVal }));
    if (
      editErrors[name] &&
      name !== 'date_of_birth' &&
      (name !== 'phone' || String(nextVal).length === 0 || String(nextVal)[0] === '9')
    ) {
      setEditErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (editApiError) setEditApiError('');
  };

  const validateForm = () => {
    const newErrors = {};

    const firstNameErr = validateName(formData.first_name, 'El nombre');
    if (firstNameErr) newErrors.first_name = firstNameErr;

    const lastNameErr = validateName(formData.last_name, 'El apellido');
    if (lastNameErr) newErrors.last_name = lastNameErr;

    if (formData.tipo_documento === 'dni') {
      const dniErr = validateDni(formData.numero_documento);
      if (dniErr) newErrors.numero_documento = dniErr;
    } else if (
      !formData.numero_documento.trim() ||
      formData.numero_documento.trim().length < 6
    ) {
      newErrors.numero_documento =
        'El número de documento debe tener entre 6 y 12 caracteres';
    }

    const emailErr = validateEmail(formData.email);
    if (emailErr) newErrors.email = emailErr;

    const passErr = validatePassword(formData.password);
    if (passErr) newErrors.password = passErr;

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!formData.specialty.trim()) {
      newErrors.specialty = 'La especialidad es obligatoria';
    } else if (formData.specialty.trim().length < 2) {
      newErrors.specialty = 'La especialidad debe tener al menos 2 caracteres';
    }

    const phoneErr = validatePhone(formData.phone, false);
    if (phoneErr) newErrors.phone = phoneErr;

    const dobErr = validateDateOfBirth(formData.date_of_birth, true);
    if (dobErr) newErrors.date_of_birth = dobErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors = {};

    const firstNameErr = validateName(editFormData.first_name, 'El nombre');
    if (firstNameErr) newErrors.first_name = firstNameErr;

    const lastNameErr = validateName(editFormData.last_name, 'El apellido');
    if (lastNameErr) newErrors.last_name = lastNameErr;

    if (editFormData.tipo_documento === 'dni') {
      const dniErr = validateDni(editFormData.numero_documento);
      if (dniErr) newErrors.numero_documento = dniErr;
    } else if (
      !editFormData.numero_documento.trim() ||
      editFormData.numero_documento.trim().length < 6
    ) {
      newErrors.numero_documento =
        'El número de documento debe tener entre 6 y 12 caracteres';
    }

    if (!editFormData.specialty.trim()) {
      newErrors.specialty = 'La especialidad es obligatoria';
    } else if (editFormData.specialty.trim().length < 2) {
      newErrors.specialty = 'La especialidad debe tener al menos 2 caracteres';
    }

    const phoneErr = validatePhone(editFormData.phone, false);
    if (phoneErr) newErrors.phone = phoneErr;

    const dobErr = validateDateOfBirth(editFormData.date_of_birth, true);
    if (dobErr) newErrors.date_of_birth = dobErr;

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        tipo_documento: formData.tipo_documento,
        numero_documento: formData.numero_documento.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: 'TRAINER',
        specialty: formData.specialty.trim(),
        phone: formData.phone.trim() || undefined,
        date_of_birth: formData.date_of_birth.trim(),
      };

      const result = await usersApi.createUser(payload);
      const created = result?.user;
      if (created) {
        setTrainers((prev) => [created, ...prev]);
      } else {
        await fetchTrainers();
      }

      setFormData(INITIAL_FORM);
      setErrors({});
      setIsModalOpen(false);
    } catch (err) {
      const backendDetails = err.response?.data?.details;
      if (Array.isArray(backendDetails) && backendDetails.length > 0) {
        const mappedErrors = {};
        backendDetails.forEach((item) => {
          if (item.field) {
            mappedErrors[item.field] = item.message;
          }
        });
        setErrors((prev) => ({ ...prev, ...mappedErrors }));
      }
      setApiError(
        err.response?.data?.error ||
          err.message ||
          'Error al guardar el entrenador'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTrainer = async (e) => {
    e.preventDefault();
    if (!editingTrainer) return;
    setEditApiError('');

    if (!validateEditForm()) return;

    setUpdating(true);
    try {
      const payload = {
        first_name: editFormData.first_name.trim(),
        last_name: editFormData.last_name.trim(),
        tipo_documento: editFormData.tipo_documento,
        numero_documento: editFormData.numero_documento.trim(),
        phone: editFormData.phone.trim() || null,
        date_of_birth: editFormData.date_of_birth.trim(),
        specialty: editFormData.specialty.trim(),
        is_active: Boolean(editFormData.is_active),
      };

      const result = await usersApi.updateUser(editingTrainer.id, payload);
      const updated = result?.user || { ...editingTrainer, ...payload };

      setTrainers((prev) =>
        prev.map((t) => (t.id === editingTrainer.id ? { ...t, ...updated } : t))
      );

      setEditingTrainer(null);
    } catch (err) {
      const backendDetails = err.response?.data?.details;
      if (Array.isArray(backendDetails) && backendDetails.length > 0) {
        const mappedErrors = {};
        backendDetails.forEach((item) => {
          if (item.field) {
            mappedErrors[item.field] = item.message;
          }
        });
        setEditErrors((prev) => ({ ...prev, ...mappedErrors }));
      }
      setEditApiError(
        err.response?.data?.error ||
          err.message ||
          'Error al actualizar el entrenador'
      );
    } finally {
      setUpdating(false);
    }
  };

  const filteredTrainers = trainers.filter((trainer) => {
    const fullName = `${trainer.first_name || ''} ${trainer.last_name || ''}`.toLowerCase();
    const specialty = (trainer.specialty || '').toLowerCase();
    const email = (trainer.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    return (
      fullName.includes(query) ||
      specialty.includes(query) ||
      email.includes(query)
    );
  });

  return (
    <DashboardLayout title="Gestión de Entrenadores">
      <div className="entrenadores-container">
        <section className="entrenadores-action-bar">
          <div className="entrenadores-search-box">
            <svg
              className="entrenadores-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Buscar por entrenador, especialidad o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="entrenadores-search-input"
            />
          </div>

          <div className="entrenadores-actions-right">
            {canEditTrainers && (
              <button
                type="button"
                onClick={openCreateModal}
                className="entrenadores-btn-new"
              >
                <span>+</span> Nuevo entrenador
              </button>
            )}
          </div>
        </section>

        <div className="table-card entrenadores-table-card">
          {loading ? (
            <p className="entrenadores-loading-text">Cargando entrenadores...</p>
          ) : (
            <table className="entrenadores-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Especialidad</th>
                  <th>Correo</th>
                  <th>Estado</th>
                  {canEditTrainers && <th className="text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTrainers.map((trainer) => (
                  <tr key={trainer.id} className="entrenadores-table-row">
                    <td>
                      <div className="trainer-info-cell">
                        <div className="trainer-avatar">
                          {getInitials(trainer.first_name, trainer.last_name)}
                        </div>
                        <div>
                          <span className="trainer-name">
                            {trainer.first_name} {trainer.last_name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="trainer-cell">
                      <span className="trainer-specialty-badge">
                        {trainer.specialty || '—'}
                      </span>
                    </td>
                    <td className="trainer-cell">
                      {trainer.email}
                    </td>
                    <td className="trainer-cell">
                      {trainer.is_active !== false ? (
                        <span className="trainer-status-badge active">
                          <span className="trainer-badge-dot"></span>
                          Activo
                        </span>
                      ) : (
                        <span className="trainer-status-badge inactive">
                          Inactivo
                        </span>
                      )}
                    </td>
                    {canEditTrainers && (
                      <td className="text-center" style={{ padding: '1.125rem 1.5rem' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(trainer)}
                          className="clientes-btn-edit"
                        >
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {filteredTrainers.length === 0 && (
                  <tr>
                    <td colSpan={canEditTrainers ? 5 : 4} className="entrenadores-empty-state">
                      No se encontraron entrenadores registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Crear Entrenador */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Entrenador</h2>
              <button
                type="button"
                className="close-btn"
                onClick={closeCreateModal}
              >
                &times;
              </button>
            </div>

            <div className="modal-form">
              <form onSubmit={handleCreateTrainer} className="user-form">
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
                    {errors.first_name && (
                      <span className="error-text">{errors.first_name}</span>
                    )}
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
                    {errors.last_name && (
                      <span className="error-text">{errors.last_name}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="tipo_documento">Tipo de Documento *</label>
                    <select
                      id="tipo_documento"
                      name="tipo_documento"
                      value={formData.tipo_documento}
                      onChange={handleChange}
                    >
                      <option value="dni">DNI</option>
                      <option value="carnet_extranjeria">Carnet de Extranjería</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="numero_documento">
                      {formData.tipo_documento === 'dni' ? 'DNI *' : 'N° Documento *'}
                    </label>
                    <input
                      id="numero_documento"
                      name="numero_documento"
                      type="text"
                      maxLength={formData.tipo_documento === 'dni' ? 8 : 12}
                      placeholder={
                        formData.tipo_documento === 'dni'
                          ? '12345678'
                          : 'N° de documento'
                      }
                      value={formData.numero_documento}
                      onChange={handleChange}
                      className={errors.numero_documento ? 'input-error' : ''}
                    />
                    {errors.numero_documento && (
                      <span className="error-text">{errors.numero_documento}</span>
                    )}
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
                    {errors.password && (
                      <span className="error-text">{errors.password}</span>
                    )}
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
                    {errors.confirmPassword && (
                      <span className="error-text">{errors.confirmPassword}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="specialty">Especialidad *</label>
                  <input
                    id="specialty"
                    name="specialty"
                    type="text"
                    placeholder="Ej. Hipertrofia, Funcional"
                    value={formData.specialty}
                    onChange={handleChange}
                    className={errors.specialty ? 'input-error' : ''}
                  />
                  {errors.specialty && (
                    <span className="error-text">{errors.specialty}</span>
                  )}
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
                    {errors.phone && (
                      <span className="error-text">{errors.phone}</span>
                    )}
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
                    {errors.date_of_birth && (
                      <span className="error-text">{errors.date_of_birth}</span>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeCreateModal}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Guardando...' : 'Crear Entrenador'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Entrenador */}
      {editingTrainer && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Entrenador</h2>
              <button
                type="button"
                className="close-btn"
                onClick={closeEditModal}
              >
                &times;
              </button>
            </div>

            <div className="modal-form">
              <form onSubmit={handleUpdateTrainer} className="user-form">
                {editApiError && (
                  <div className="form-alert error">{editApiError}</div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit_first_name">Nombres *</label>
                    <input
                      id="edit_first_name"
                      name="first_name"
                      type="text"
                      value={editFormData.first_name}
                      onChange={handleEditChange}
                      className={editErrors.first_name ? 'input-error' : ''}
                    />
                    {editErrors.first_name && (
                      <span className="error-text">{editErrors.first_name}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit_last_name">Apellidos *</label>
                    <input
                      id="edit_last_name"
                      name="last_name"
                      type="text"
                      value={editFormData.last_name}
                      onChange={handleEditChange}
                      className={editErrors.last_name ? 'input-error' : ''}
                    />
                    {editErrors.last_name && (
                      <span className="error-text">{editErrors.last_name}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit_tipo_documento">Tipo de Documento *</label>
                    <select
                      id="edit_tipo_documento"
                      name="tipo_documento"
                      value={editFormData.tipo_documento}
                      onChange={handleEditChange}
                    >
                      <option value="dni">DNI</option>
                      <option value="carnet_extranjeria">Carnet de Extranjería</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit_numero_documento">
                      {editFormData.tipo_documento === 'dni' ? 'DNI *' : 'N° Documento *'}
                    </label>
                    <input
                      id="edit_numero_documento"
                      name="numero_documento"
                      type="text"
                      maxLength={editFormData.tipo_documento === 'dni' ? 8 : 12}
                      value={editFormData.numero_documento}
                      onChange={handleEditChange}
                      className={editErrors.numero_documento ? 'input-error' : ''}
                    />
                    {editErrors.numero_documento && (
                      <span className="error-text">{editErrors.numero_documento}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="edit_specialty">Especialidad *</label>
                  <input
                    id="edit_specialty"
                    name="specialty"
                    type="text"
                    placeholder="Ej. Hipertrofia, Funcional"
                    value={editFormData.specialty}
                    onChange={handleEditChange}
                    className={editErrors.specialty ? 'input-error' : ''}
                  />
                  {editErrors.specialty && (
                    <span className="error-text">{editErrors.specialty}</span>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit_phone">Teléfono (Opcional)</label>
                    <input
                      id="edit_phone"
                      name="phone"
                      type="tel"
                      maxLength="9"
                      placeholder="912345678"
                      value={editFormData.phone}
                      onChange={handleEditChange}
                      className={editErrors.phone ? 'input-error' : ''}
                    />
                    {editErrors.phone && (
                      <span className="error-text">{editErrors.phone}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit_date_of_birth">Fecha de Nacimiento *</label>
                    <input
                      id="edit_date_of_birth"
                      name="date_of_birth"
                      type="date"
                      max={maxBirthDate}
                      min="1900-01-01"
                      value={editFormData.date_of_birth}
                      onChange={handleEditChange}
                      required
                      className={editErrors.date_of_birth ? 'input-error' : ''}
                    />
                    {editErrors.date_of_birth && (
                      <span className="error-text">{editErrors.date_of_birth}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={Boolean(editFormData.is_active)}
                      onChange={handleEditChange}
                    />
                    Entrenador activo
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeEditModal}
                    disabled={updating}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={updating}
                  >
                    {updating ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}