import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { membershipsApi } from '../../api/membershipsApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/common/Loader';
import { PATHS } from '../../routes/paths';
import '../../styles/users.css';
import '../../styles/memberships.css';

export default function Inicio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isClient = user?.role === 'CLIENT';

  const [activeMembership, setActiveMembership] = useState(null);
  const [loading, setLoading] = useState(isClient);

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
                      onClick={() => navigate(PATHS.MEMBERSHIPS)}
                      style={{ marginTop: '16px', width: '100%' }}
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
                    <span className="info-key">DNI:</span>
                    <span className="info-val">{user?.dni || '-'}</span>
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
                  onClick={() => navigate(PATHS.PROFILE)}
                  style={{ marginTop: '20px', width: '100%' }}
                >
                  Ver mis datos completos
                </button>
              </div>
            </div>
          </div>
        )}
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
