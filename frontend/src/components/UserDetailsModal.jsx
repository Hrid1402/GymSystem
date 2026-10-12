import React from 'react';
import '../styles/userModal.css';

/**
 * UserDetailsModal Component
 * Modal de sólo lectura para visualizar la información detallada de un usuario o cliente.
 */
export default function UserDetailsModal({ isOpen, onClose, user, membership }) {
  if (!isOpen || !user) return null;

  const getRoleLabel = (role) => {
    switch (role) {
      case 'MANAGER':
        return 'Gerente';
      case 'RECEPTIONIST':
        return 'Recepcionista';
      case 'CLIENT':
        return 'Cliente';
      default:
        return role || 'No especificado';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No registrada';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${first}${last}` || 'U';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container" 
        style={{ maxWidth: '560px' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Detalles del Usuario</h2>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar modal">
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.75rem', maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Header Profile Summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
            <div 
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '9999px',
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                fontSize: '1.25rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {getInitials(user.first_name, user.last_name)}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>
                {user.first_name} {user.last_name}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '4px' }}>
                <span 
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}
                >
                  {getRoleLabel(user.role)}
                </span>
                <span 
                  className={`status-badge ${user.is_active !== false ? 'active' : 'inactive'}`}
                  style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                >
                  {user.is_active !== false ? 'Cuenta Activa' : 'Cuenta Inactiva'}
                </span>
              </div>
            </div>
          </div>

          {/* Grid de Información General (Readonly) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>
                Correo Electrónico
              </span>
              <strong style={{ fontSize: '0.9375rem', color: '#1e293b', wordBreak: 'break-all' }}>
                {user.email || '—'}
              </strong>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>
                DNI / Documento
              </span>
              <strong style={{ fontSize: '0.9375rem', color: '#1e293b' }}>
                {user.dni || '—'}
              </strong>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>
                Teléfono / Celular
              </span>
              <strong style={{ fontSize: '0.9375rem', color: '#1e293b' }}>
                {user.phone || 'No registrado'}
              </strong>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>
                Fecha de Nacimiento
              </span>
              <strong style={{ fontSize: '0.9375rem', color: '#1e293b' }}>
                {formatDate(user.date_of_birth)}
              </strong>
            </div>
          </div>

          {/* Sección de Membresía si aplica (para clientes o si se pasa prop membership) */}
          {user.role === 'CLIENT' && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem', fontWeight: 600, color: '#334155' }}>
                Estado de Membresía
              </h4>
              {membership ? (
                <div 
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#15803d' }}>
                      {membership.plan_name || 'Plan Activo'}
                    </span>
                    <span className="status-badge active">
                      {membership.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155' }}>
                    <div>
                      <span style={{ color: '#166534', fontWeight: 500 }}>Inicio: </span>
                      {formatDate(membership.start_date)}
                    </div>
                    <div>
                      <span style={{ color: '#166534', fontWeight: 500 }}>Vence: </span>
                      {formatDate(membership.end_date)}
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '0.875rem'
                  }}
                >
                  El cliente no cuenta con una membresía activa en este momento.
                </div>
              )}
            </div>
          )}

          {/* Botón de Cerrar */}
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
