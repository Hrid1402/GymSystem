import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { plansApi } from '../../api/plansApi';
import '../../styles/userModal.css';
import '../../styles/planModal.css';

export default function PlanModal({
  isOpen,
  onClose,
  plan = null, // null = crear, object = editar
  onPlanSaved,
  onPlanDeleted,
}) {
  const isEditing = Boolean(plan);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '',
    is_active: true,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // 'delete' | null

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        price: plan.price !== undefined ? String(plan.price) : '',
        duration_days: plan.duration_days !== undefined ? String(plan.duration_days) : '',
        is_active: plan.is_active !== undefined ? plan.is_active : true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        duration_days: '',
        is_active: true,
      });
    }
    setErrors({});
    setApiError('');
    setConfirmAction(null);
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del plan es obligatorio';
    } else if (formData.name.trim().length > 255) {
      newErrors.name = 'El nombre no puede exceder los 255 caracteres';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'La descripción no puede exceder los 1000 caracteres';
    }

    if (formData.price === '' || isNaN(Number(formData.price))) {
      newErrors.price = 'Ingrese un precio válido';
    } else if (Number(formData.price) < 0) {
      newErrors.price = 'El precio no puede ser negativo';
    }

    if (formData.duration_days === '' || isNaN(Number(formData.duration_days))) {
      newErrors.duration_days = 'Ingrese una duración en días';
    } else if (!Number.isInteger(Number(formData.duration_days)) || Number(formData.duration_days) <= 0) {
      newErrors.duration_days = 'La duración debe ser un número entero mayor a 0';
    } else if (Number(formData.duration_days) > 3650) {
      newErrors.duration_days = 'La duración no puede superar los 3650 días';
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
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: Number(formData.price),
        duration_days: Number(formData.duration_days),
        is_active: formData.is_active,
      };

      if (isEditing) {
        const res = await plansApi.updatePlan(plan.id, payload);
        toast.success('Plan actualizado con éxito');
        if (onPlanSaved) onPlanSaved(res.plan);
      } else {
        const res = await plansApi.createPlan(payload);
        toast.success('Plan creado con éxito');
        if (onPlanSaved) onPlanSaved(res.plan);
      }
      onClose();
    } catch (err) {
      const msg = err.message || 'Error al guardar el plan';
      setApiError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Manejo de eliminación permanente
  const handleDeleteConfirm = async () => {
    setLoading(true);
    setApiError('');
    try {
      await plansApi.deletePlan(plan.id);
      toast.success('Plan eliminado con éxito');
      if (onPlanDeleted) onPlanDeleted(plan.id);
      onClose();
    } catch (err) {
      const msg = err.message || 'Error al eliminar el plan';
      setApiError(msg);
      toast.error(msg);
      setConfirmAction(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container plan-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Editar Plan' : 'Nuevo Plan'}</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          {apiError && (
            <div className="form-alert error" style={{ color: '#dc2626' }}>
              {apiError}
            </div>
          )}

          {/* Nombre */}
          <div className="form-group">
            <label htmlFor="name">Nombre del Plan *</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Ej. Plan Mensual VIP"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              className={errors.name ? 'input-error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label htmlFor="description">Descripción (Opcional)</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              placeholder="Detalle de beneficios incluidos en el plan..."
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              className={errors.description ? 'input-error' : ''}
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-row">
            {/* Precio */}
            <div className="form-group">
              <label htmlFor="price">Precio (S/) *</label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.price}
                onChange={handleChange}
                disabled={loading}
                className={errors.price ? 'input-error' : ''}
              />
              {errors.price && <span className="error-text">{errors.price}</span>}
            </div>

            {/* Duración en días */}
            <div className="form-group">
              <label htmlFor="duration_days">Duración (Días) *</label>
              <input
                id="duration_days"
                name="duration_days"
                type="number"
                min="1"
                placeholder="Ej. 30"
                value={formData.duration_days}
                onChange={handleChange}
                disabled={loading}
                className={errors.duration_days ? 'input-error' : ''}
              />
              {errors.duration_days && <span className="error-text">{errors.duration_days}</span>}
            </div>
          </div>

          {/* Estado activo */}
          <div className="form-group-checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                disabled={loading}
              />
              <span>Plan activo (visible para clientes en la landing page)</span>
            </label>
          </div>

          {/* Acciones principales del formulario */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Plan'}
            </button>
          </div>

          {/* Zona de peligro al editar: Eliminar permanentemente */}
          {isEditing && (
            <div className="danger-zone-section">
              {confirmAction === 'delete' ? (
                <div className="confirm-box">
                  <p>¿Estás seguro de eliminar permanentemente este plan? Esta acción no se puede deshacer.</p>
                  <div className="confirm-buttons">
                    <button
                      type="button"
                      className="btn-danger-confirm"
                      onClick={handleDeleteConfirm}
                      disabled={loading}
                    >
                      {loading ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary-sm"
                      onClick={() => setConfirmAction(null)}
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="danger-actions-row">
                  <button
                    type="button"
                    className="btn-danger-solid"
                    onClick={() => setConfirmAction('delete')}
                    disabled={loading}
                  >
                    Eliminar plan
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
