import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { membershipsApi } from '../../api/membershipsApi';
import { plansApi } from '../../api/plansApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/common/Loader';
import '../../styles/users.css';
import '../../styles/memberships.css';

export default function Membresias() {
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT';

  const [memberships, setMemberships] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('mine'); // Para cliente: 'mine' | 'explore'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // Para staff
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [enrollingPlanId, setEnrollingPlanId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [isClient]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (isClient) {
        const [memRes, plansRes] = await Promise.all([
          membershipsApi.getMyMemberships().catch(() => ({ memberships: [] })),
          plansApi.getPlans().catch(() => ({ plans: [] })),
        ]);
        setMemberships(memRes?.memberships || []);
        setPlans(plansRes?.plans || []);
      } else {
        const response = await membershipsApi.getAllMemberships();
        setMemberships(response?.memberships || []);
      }
    } catch (err) {
      const msg = err.message || 'Error al obtener las membresías';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMembership = async (membershipId) => {
    setCancellingId(membershipId);
    try {
      const res = await membershipsApi.cancelMembership(membershipId);
      toast.success('Membresía cancelada con éxito');
      setMemberships((prev) =>
        prev.map((m) => (m.id === membershipId ? res.membership || { ...m, status: 'CANCELLED' } : m))
      );
      setConfirmCancelId(null);
    } catch (err) {
      const msg = err.message || 'Error al cancelar la membresía';
      toast.error(msg);
    } finally {
      setCancellingId(null);
    }
  };

  const handleEnroll = async (plan) => {
    setEnrollingPlanId(plan.id);
    try {
      const res = await membershipsApi.enroll({ plan_id: plan.id });
      toast.success(`¡Te has inscrito al ${plan.name} con éxito!`);
      // Refrescar membresías
      const memRes = await membershipsApi.getMyMemberships();
      setMemberships(memRes?.memberships || [res.membership]);
      setActiveTab('mine');
    } catch (err) {
      const msg = err.message || 'Error al inscribirse al plan';
      toast.error(msg);
    } finally {
      setEnrollingPlanId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  // Cálculo de días restantes
  const calculateDaysRemaining = (endDateStr) => {
    if (!endDateStr) return 0;
    const end = new Date(endDateStr.split('T')[0] + 'T23:59:59');
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="status-badge active">Activa</span>;
      case 'EXPIRED':
        return <span className="status-badge expired">Vencida</span>;
      case 'CANCELLED':
        return <span className="status-badge cancelled">Cancelada</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  // ==========================================
  // VISTA CLIENTE
  // ==========================================
  if (isClient) {
    const activeMembership = memberships.find((m) => m.status === 'ACTIVE');
    const pastMemberships = memberships.filter((m) => m.status !== 'ACTIVE');
    const daysRemaining = activeMembership ? calculateDaysRemaining(activeMembership.end_date) : 0;

    return (
      <DashboardLayout title="Mi Membresía">
        {/* Barra superior de pestañas del cliente */}
        <div className="client-tabs-nav">
          <button
            type="button"
            className={`client-tab-btn ${activeTab === 'mine' ? 'active' : ''}`}
            onClick={() => setActiveTab('mine')}
          >
            Mi Estado
          </button>
          <button
            type="button"
            className={`client-tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveTab('explore')}
          >
            Explorar Planes
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <Loader text="Cargando tu información..." />
          </div>
        ) : error ? (
          <div className="form-alert error" style={{ color: '#dc2626', marginBottom: '16px' }}>
            {error}
          </div>
        ) : activeTab === 'mine' ? (
          <div className="client-membership-content">
            {/* Tarjeta de Membresía Activa */}
            {activeMembership ? (
              <div className="active-membership-hero-card">
                <div className="active-card-top">
                  <div className="active-card-badge-row">
                    <span className="hero-status-pill active">Activa</span>
                    <span className="membership-code">{activeMembership.id}</span>
                  </div>
                  <h2 className="active-plan-title">{activeMembership.plan_name}</h2>
                </div>

                <div className="active-card-metrics">
                  <div className="metric-box highlighted">
                    <span className="metric-label">Días restantes</span>
                    <strong className="metric-value">{daysRemaining}</strong>
                    <span className="metric-sub">
                      {daysRemaining === 1 ? 'día restante' : 'días restantes de entrenamiento'}
                    </span>
                  </div>

                  <div className="metric-box">
                    <span className="metric-label">Fecha de Inicio</span>
                    <strong className="metric-value-date">{formatDate(activeMembership.start_date)}</strong>
                    <span className="metric-sub">Inicio de periodo</span>
                  </div>

                  <div className="metric-box">
                    <span className="metric-label">Fecha de Vencimiento</span>
                    <strong className="metric-value-date">{formatDate(activeMembership.end_date)}</strong>
                    <span className="metric-sub">Fin de periodo</span>
                  </div>
                </div>

                {/* Zona de cancelación de membresía */}
                <div className="active-card-footer">
                  {confirmCancelId === activeMembership.id ? (
                    <div className="cancel-confirmation-box">
                      <p>
                        ¿Estás seguro de cancelar tu membresía actual? Esta acción cancelará tu acceso inmediato.
                      </p>
                      <div className="confirm-buttons">
                        <button
                          type="button"
                          className="btn-danger-confirm-sm"
                          onClick={() => handleCancelMembership(activeMembership.id)}
                          disabled={cancellingId === activeMembership.id}
                        >
                          {cancellingId === activeMembership.id ? 'Cancelando...' : 'Sí, cancelar membresía'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary-sm"
                          onClick={() => setConfirmCancelId(null)}
                          disabled={cancellingId === activeMembership.id}
                        >
                          No cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="footer-action-row">
                      <button
                        type="button"
                        className="btn-danger-cancel-client"
                        onClick={() => setConfirmCancelId(activeMembership.id)}
                      >
                        Cancelar membresía
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="no-membership-card">
                <div className="no-membership-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                </div>
                <h3>No tienes ninguna membresía activa</h3>
                <p>
                  Inscríbete a cualquiera de nuestros planes para comenzar tu entrenamiento hoy mismo.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setActiveTab('explore')}
                >
                  Explorar planes disponibles
                </button>
              </div>
            )}

            {/* Historial de Membresías Pasadas */}
            <div className="history-section">
              <h3 className="section-title">Historial de membresías</h3>
              <div className="table-card">
                {pastMemberships.length > 0 ? (
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Plan</th>
                        <th>Fecha Inicio</th>
                        <th>Fecha Fin</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastMemberships.map((m) => (
                        <tr key={m.id}>
                          <td className="text-muted">{m.id}</td>
                          <td>
                            <strong>{m.plan_name}</strong>
                          </td>
                          <td className="text-muted">{formatDate(m.start_date)}</td>
                          <td className="text-muted">{formatDate(m.end_date)}</td>
                          <td>{getStatusBadge(m.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    No tienes membresías anteriores registradas.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Pestaña: Explorar Planes */
          <div className="client-explore-plans">
            <div className="explore-header">
              <h3>Planes disponibles</h3>
              <p>Elige el plan que mejor se adapte a tus objetivos de entrenamiento.</p>
              {activeMembership && (
                <div className="explore-notice-banner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>
                    Solo es posible tener una membresía activa al mismo tiempo. Si deseas cambiarte a otro plan, debes cancelar tu membresía actual primero.
                  </span>
                </div>
              )}
            </div>

            <div className="plans-cards-grid">
              {plans.map((p) => {
                const isCurrentPlan = activeMembership && activeMembership.plan_id === p.id;
                const isEnrolling = enrollingPlanId === p.id;

                return (
                  <div key={p.id} className={`plan-card-item ${isCurrentPlan ? 'is-active-plan' : ''}`}>
                    {isCurrentPlan && <div className="current-badge">Tu plan actual</div>}
                    <h4 className="plan-name">{p.name}</h4>
                    <p className="plan-desc">
                      {p.description || 'Acceso total a máquinas, peso libre y áreas comunes de GymStark.'}
                    </p>

                    <div className="plan-price-row">
                      <strong>S/ {Number(p.price).toFixed(2)}</strong>
                      <span>/ {p.duration_days} {p.duration_days === 1 ? 'día' : 'días'}</span>
                    </div>

                    <div className="plan-footer-action">
                      {isCurrentPlan ? (
                        <button type="button" className="btn-plan-status-active" disabled>
                          Activo actualmente
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-plan-enroll-client"
                          onClick={() => handleEnroll(p)}
                          disabled={Boolean(activeMembership) || isEnrolling}
                          title={
                            activeMembership
                              ? 'Ya cuentas con una membresía activa. Debes cancelarla antes de unirte a otra.'
                              : 'Inscribirse ahora'
                          }
                        >
                          {isEnrolling ? 'Inscribiendo...' : 'Inscribirse'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {plans.length === 0 && (
                <p style={{ color: '#64748b', textAlign: 'center', gridColumn: '1 / -1' }}>
                  No hay planes disponibles por el momento.
                </p>
              )}
            </div>
          </div>
        )}
      </DashboardLayout>
    );
  }

  // ==========================================
  // VISTA STAFF (Gerente y Recepcionista)
  // ==========================================
  const filteredMemberships = memberships.filter((m) => {
    const query = searchTerm.toLowerCase();
    const fullName = `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase();
    const dni = (m.dni || '').toLowerCase();
    const planName = (m.plan_name || '').toLowerCase();
    const id = (m.id || '').toLowerCase();

    const matchesSearch =
      fullName.includes(query) || dni.includes(query) || planName.includes(query) || id.includes(query);

    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout title="Gestión de Membresías">
      <section className="action-bar memberships-bar">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Buscar por cliente, DNI, plan o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="status-filter-wrapper">
          <select
            className="status-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">Activas</option>
            <option value="EXPIRED">Vencidas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
      </section>

      {error && (
        <div className="form-alert error" style={{ color: '#dc2626', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <Loader text="Cargando membresías..." />
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>DNI</th>
                <th>Plan</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMemberships.map((membership) => (
                <tr key={membership.id}>
                  <td>
                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.9375rem' }}>
                      {membership.first_name} {membership.last_name}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {membership.id}
                    </span>
                  </td>
                  <td className="text-muted">{membership.dni || '-'}</td>
                  <td>
                    <strong style={{ color: '#1e293b' }}>
                      {membership.plan_name}
                    </strong>
                  </td>
                  <td className="text-muted">{formatDate(membership.start_date)}</td>
                  <td className="text-muted">{formatDate(membership.end_date)}</td>
                  <td>{getStatusBadge(membership.status)}</td>
                  <td className="text-right">
                    {membership.status === 'ACTIVE' && (
                      confirmCancelId === membership.id ? (
                        <div className="table-confirm-actions">
                          <button
                            type="button"
                            className="btn-danger-confirm-sm"
                            onClick={() => handleCancelMembership(membership.id)}
                            disabled={cancellingId === membership.id}
                          >
                            {cancellingId === membership.id ? 'Cancelando...' : 'Confirmar'}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary-sm"
                            onClick={() => setConfirmCancelId(null)}
                            disabled={cancellingId === membership.id}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-cancel-membership"
                          onClick={() => setConfirmCancelId(membership.id)}
                          title="Cancelar membresía activa"
                        >
                          Cancelar
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
              {filteredMemberships.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No se encontraron membresías.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
