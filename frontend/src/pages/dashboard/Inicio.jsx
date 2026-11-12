import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { membershipsApi } from '../../api/membershipsApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/common/Loader';
import ClientQrModal from '../../components/ClientQrModal';
import { PATHS } from '../../routes/paths';
import '../../styles/users.css';
import '../../styles/memberships.css';

export default function Inicio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isClient = user?.role === 'CLIENT';

  const [activeMembership, setActiveMembership] = useState(null);
  const [loading, setLoading] = useState(isClient);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (isClient) {
      membershipsApi
        .getMyMemberships()
        .then((res) => {
          const active = (res?.memberships || []).find((m) => m.status === 'ACTIVE');
          setActiveMembership(active || null);
        })
        .catch(() => setActiveMembership(null))
        .finally(() => setLoading(false));
    }
  }, [isClient]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
  };

  const calculateDaysRemaining = (endDateStr) => {
    if (!endDateStr) return 0;
    const end = new Date(endDateStr.split('T')[0] + 'T23:59:59');
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  if (isClient) {
    const daysRemaining = activeMembership ? calculateDaysRemaining(activeMembership.end_date) : 0;

    return (
      <DashboardLayout title="Panel Principal">
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <Loader text="Cargando tu información..." />
          </div>
        ) : (
          <div className="client-dashboard-home">
            {/* Tarjeta de bienvenida */}
            <div className="client-welcome-card">
              <div className="welcome-text">
                <h2>¡Hola de nuevo, {user?.first_name || 'Atleta'}!</h2>
                <p>
                  Bienvenido a tu panel de GymStark. Aquí puedes revisar el estado de tu suscripción y explorar nuevas opciones.
                </p>
              </div>
            </div>

            {/* Resumen de estado de membresía */}
            <div className="client-home-grid">
              <div className="client-home-card main-status">
                <div className="card-header-row">
                  <h3>Estado de suscripción</h3>
                  {activeMembership ? (
                    <span className="hero-status-pill active">Activo</span>
                  ) : (
                    <span className="hero-status-pill inactive">Sin plan activo</span>
                  )}
                </div>

                {activeMembership ? (
                  <div className="active-home-details">
                    <p className="home-plan-name">{activeMembership.plan_name}</p>
                    <div className="home-stats-row">
                      <div className="home-stat-item">
                        <span className="stat-label">Días restantes</span>
                        <strong className="stat-num">{daysRemaining}</strong>
                      </div>
                      <div className="home-stat-item">
                        <span className="stat-label">Vencimiento</span>
                        <strong className="stat-text">{formatDate(activeMembership.end_date)}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setShowQrModal(true)}
                      style={{
                        marginTop: '16px',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontWeight: 600,
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      <span>Mi Código QR de Acceso</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => navigate(PATHS.MEMBERSHIPS)}
                      style={{ marginTop: '8px', width: '100%' }}
                    >
                      Gestionar mi membresía
                    </button>
                  </div>
                ) : (
                  <div className="no-active-home-details">
                    <p style={{ color: '#64748b', margin: '16px 0' }}>
                      Actualmente no tienes un plan contratado. Inscríbete a un plan para comenzar a entrenar.
                    </p>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => navigate(PATHS.MEMBERSHIPS)}
                      style={{ width: '100%' }}
                    >
                      Ver planes disponibles
                    </button>
                  </div>
                )}
              </div>

              {/* Acceso rápido e información */}
              <div className="client-home-card quick-info">
                <h3>Información de cuenta</h3>
                <div className="info-list">
                  <div className="info-row">
                    <span className="info-key">
                      {user?.tipo_documento === 'carnet_extranjeria'
                        ? 'C.E.:'
                        : user?.tipo_documento === 'pasaporte'
                          ? 'Pasaporte:'
                          : 'DNI:'}
                    </span>
                    <span className="info-val">{user?.numero_documento || user?.dni || '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Correo:</span>
                    <span className="info-val">{user?.email || '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Teléfono:</span>
                    <span className="info-val">{user?.phone || 'No registrado'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate(`${PATHS.MEMBERSHIPS}?tab=attendances`)}
                  style={{ marginTop: '16px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>Historial de asistencias</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate(PATHS.PROFILE)}
                  style={{ marginTop: '8px', width: '100%' }}
                >
                  Ver mis datos completos
                </button>
              </div>
            </div>
          </div>
        )}

        <ClientQrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} />
      </DashboardLayout>
    );
  }

  // Vista para staff (Gerente y Recepcionista)
  return (
    <DashboardLayout title="Inicio">
      <div className="table-card" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
        <p>Módulo de Inicio en construcción.</p>
      </div>
    </DashboardLayout>
  );
}
