import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Banknote, Check, CreditCard, ShieldCheck, TrendingUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { membershipsApi } from '../../api/membershipsApi';
import { plansApi } from '../../api/plansApi';
import { paymentsApi } from '../../api/paymentsApi';
import { invoicesApi } from '../../api/invoicesApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/common/Loader';
import ClientQrModal from '../../components/ClientQrModal';
import ClientAttendanceHistory from '../../components/ClientAttendanceHistory';
import PaymentSuccessModal from '../../components/PaymentSuccessModal';
import { useAuth } from '../../context/AuthContext';
import '../../styles/memberships.css';
import '../../styles/users.css';
import '../../styles/billingModal.css';

export default function Membresias() {
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT';
  const [searchParams, setSearchParams] = useSearchParams();

  const [memberships, setMemberships] = useState([]);
  const [plans, setPlans] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [successPaymentData, setSuccessPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('mine'); // Para cliente: 'mine' | 'explore'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // Para gerente
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL'); // 'ALL' | 'EFECTIVO' | 'ONLINE'
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [enrollingPlanId, setEnrollingPlanId] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const pollingIntervalRef = useRef(null);

  // Detección de pestaña por query param (?tab=attendances / explore / mine)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'attendances' || tabParam === 'explore' || tabParam === 'mine') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Detección de retorno de pasarela de pago (?payment=success / failure / pending)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (!paymentStatus) return;

    if (paymentStatus === 'success') {
      toast.success('¡Pago procesado con éxito! Confirmando la activación de tu membresía...');
      startMembershipPolling();
    } else if (paymentStatus === 'failure') {
      toast.error('El pago no fue completado o fue rechazado por el banco.');
    } else if (paymentStatus === 'pending') {
      toast.info('Tu pago está en proceso de acreditación.');
      startMembershipPolling();
    }

    // Limpiar query params de la URL para que no vuelva a dispararse al recargar
    setSearchParams({}, { replace: true });
  }, []);

  // Polling para verificar la activación asíncrona de la membresía vía webhook
  const startMembershipPolling = () => {
    setPollingActive(true);
    let attempts = 0;
    const maxAttempts = 6; // Intentar cada 2.5s durante 15s

    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    pollingIntervalRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const memRes = await membershipsApi.getMyMemberships();
        const active = (memRes?.memberships || []).find((m) => m.status === 'ACTIVE');

        if (active) {
          setMemberships(memRes.memberships);
          setPollingActive(false);
          clearInterval(pollingIntervalRef.current);
          toast.success(`¡Tu membresía ${active.plan_name} ya está activa!`);
          return;
        }

        if (attempts >= maxAttempts) {
          setPollingActive(false);
          clearInterval(pollingIntervalRef.current);
          fetchData();
        }
      } catch {
        if (attempts >= maxAttempts) {
          setPollingActive(false);
          clearInterval(pollingIntervalRef.current);
        }
      }
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [isClient]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (isClient) {
        const [memRes, plansRes, invoicesRes] = await Promise.all([
          membershipsApi.getMyMemberships().catch(() => ({ memberships: [] })),
          plansApi.getPlans().catch(() => ({ plans: [] })),
          invoicesApi.getMyInvoices().catch(() => ({ invoices: [] })),
        ]);
        setMemberships(memRes?.memberships || []);
        setPlans(plansRes?.plans || []);
        setCatalog(plansRes?.catalog || []);
        setInvoices(invoicesRes?.invoices || []);
      } else {
        const [response, plansRes] = await Promise.all([
          membershipsApi.getAllMemberships(),
          plansApi.getPlans().catch(() => ({ plans: [] })),
        ]);
        setMemberships(response?.memberships || []);
        setPlans(plansRes?.plans || []);
        setCatalog(plansRes?.catalog || []);
      }
    } catch (err) {
      const msg = err.message || 'Error al obtener las membresías';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    if (!invoice?.id) return;
    setDownloadingInvoiceId(invoice.id);
    const docName = `comprobante-${invoice.serie || 'B001'}-${String(invoice.correlativo || '1').padStart(8, '0')}.pdf`;
    try {
      await invoicesApi.downloadPdf(invoice.id, docName);
      toast.success('Comprobante descargado exitosamente.');
    } catch (err) {
      console.error('Error al descargar comprobante:', err);
      toast.error(err.message || 'Error al descargar el comprobante en PDF.');
    } finally {
      setDownloadingInvoiceId(null);
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
      setCancelTarget(null);
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

      // Si requiere pago mediante Culqi Checkout v4
      if (res?.payment_required) {
        if (!window.Culqi) {
          toast.error('No se pudo cargar la pasarela de pagos Culqi. Por favor recarga la página.');
          return;
        }

        const culqiPublicKey = import.meta.env.VITE_CULQI_PUBLIC_KEY;
        if (!culqiPublicKey) {
          toast.error('Falta configurar VITE_CULQI_PUBLIC_KEY en frontend/.env.');
          return;
        }

        window.Culqi.publicKey = culqiPublicKey;

        // Prellenar automáticamente el correo y nombre del cliente en Culqi Checkout
        window.Culqi.client = {
          email: user?.email || '',
          firstName: user?.first_name || '',
          lastName: user?.last_name || '',
        };

        window.Culqi.settings({
          title: `GymStark - ${plan.name}`,
          description: plan.description || `Acceso completo por ${plan.duration_days} días`,
          currency: res.currency || 'PEN',
          amount: res.amount_cents || Math.round(Number(plan.price) * 100),
        });

        window.Culqi.options({
          lang: 'es',
          installments: false,
          modal: true,
          client: {
            email: user?.email || '',
          },
          paymentMethods: {
            tarjeta: true,
            yape: true,
            bancaMovil: false,
            agente: false,
            billeteras: false,
            cuotealo: false,
          },
        });

        // Callback oficial de Culqi al interactuar con el formulario
        window.culqi = async () => {
          if (window.Culqi.token) {
            const token = window.Culqi.token;
            window.Culqi.close();
            const loadingToast = toast.loading('Procesando pago con Culqi...');
            try {
              const chargeRes = await paymentsApi.charge({
                plan_id: plan.id,
                token_id: token.id,
                order_id: res.order_id,
              });
              toast.dismiss(loadingToast);
              toast.success(`¡Pago completado! Te has suscrito exitosamente al ${plan.name}.`);
              await fetchData();
              setActiveTab('mine');

              if (chargeRes?.invoice) {
                setSuccessPaymentData({
                  membership: chargeRes.membership,
                  invoice: chargeRes.invoice,
                  plan,
                });
              }
            } catch (chargeErr) {
              toast.dismiss(loadingToast);
              const errMsg =
                chargeErr?.response?.data?.error ||
                chargeErr?.message ||
                'Error al procesar el cobro en Culqi';
              toast.error(errMsg);
            }
          } else if (window.Culqi.order) {
            window.Culqi.close();
            toast.success('¡Orden recibida! Tu membresía se activará tan pronto se confirme la acreditación.');
            await fetchData();
            setActiveTab('mine');
          } else if (window.Culqi.error) {
            console.error('Culqi checkout error:', window.Culqi.error);
            toast.error(
              window.Culqi.error.user_message ||
              window.Culqi.error.merchant_message ||
              'Error en la pasarela de pago'
            );
          }
        };

        window.Culqi.open();
        return;
      }

      toast.success(`¡Te has inscrito al ${plan.name} con éxito!`);
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

  const formatDocType = (type) => {
    if (!type) return 'Doc.';
    switch (type.toLowerCase()) {
      case 'dni':
        return 'DNI';
      case 'carnet_extranjeria':
        return 'C.E.';
      case 'pasaporte':
        return 'Pasaporte';
      default:
        return type.toUpperCase();
    }
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
            className={`client-tab-btn ${activeTab === 'attendances' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendances')}
          >
            Mis Asistencias
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
            {pollingActive && (
              <div className="payment-confirming-banner">
                <div className="spinner-sm"></div>
                <div>
                  <strong>Estamos confirmando tu pago con Culqi...</strong>
                  <p>Tu membresía se activará en unos segundos de forma automática.</p>
                </div>
              </div>
            )}

            {/* Tarjeta de Membresía Activa */}
            {activeMembership ? (
              <div className="active-membership-hero-card">
                <div className="active-card-top">
                  <div className="active-card-badge-row">
                    <span className="hero-status-pill active">Activa</span>
                    <span className="membership-code">{activeMembership.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 className="active-plan-title" style={{ margin: 0 }}>{activeMembership.plan_name}</h2>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setShowQrModal(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      <span>Mi Código QR</span>
                    </button>
                  </div>
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
                  <div className="footer-action-row">
                    <button
                      type="button"
                      className="btn-danger-cancel-client"
                      onClick={() => setCancelTarget(activeMembership)}
                    >
                      Cancelar membresía
                    </button>
                  </div>
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

            {/* Historial de Membresías y Comprobantes de Pago */}
            <div className="history-section">
              <div style={{ marginBottom: '16px' }}>
                <h3 className="section-title" style={{ marginBottom: '4px' }}>Historial de membresías y comprobantes</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  Consulta tus suscripciones y descarga tus comprobantes electrónicos oficiales autorizados por SUNAT.
                </p>
              </div>
              <div className="table-card table-scrollable">
                {memberships.length > 0 ? (
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Periodo</th>
                        <th>Estado</th>
                        <th>Importe</th>
                        <th style={{ textAlign: 'right' }}>Comprobante SUNAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberships.map((m) => {
                        const matchingInvoice =
                          invoices.find((inv) => inv.membership_id === m.id) ||
                          invoices.find((inv) => inv.plan_id === m.plan_id);
                        const isDownloading = matchingInvoice && downloadingInvoiceId === matchingInvoice.id;

                        return (
                          <tr key={m.id}>
                            <td>
                              <strong style={{ color: '#0f172a' }}>{m.plan_name}</strong>
                            </td>
                            <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                              {formatDate(m.start_date)} - {formatDate(m.end_date)}
                            </td>
                            <td>{getStatusBadge(m.status)}</td>
                            <td>
                              {matchingInvoice ? (
                                <strong style={{ color: '#0f172a' }}>
                                  S/ {Number(matchingInvoice.total_venta).toFixed(2)}
                                </strong>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {matchingInvoice ? (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadInvoice(matchingInvoice)}
                                  disabled={isDownloading}
                                  title={`Descargar ${matchingInvoice.serie}-${String(matchingInvoice.correlativo).padStart(8, '0')} (PDF SUNAT)`}
                                  style={{
                                    backgroundColor: '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '7px 14px',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: isDownloading ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                    transition: 'background-color 0.15s ease',
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                  </svg>
                                  <span>{isDownloading ? 'Descargando...' : 'Descargar Boleta'}</span>
                                </button>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '0.85rem' }}>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    No tienes membresías o comprobantes registrados.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'attendances' ? (
          <ClientAttendanceHistory onOpenQrModal={() => setShowQrModal(true)} />
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

                    <ul className="plan-benefits-list">
                      <li className="plan-benefit-item included">
                        <Check size={16} />
                        <span>Zona de máquinas y peso libre</span>
                      </li>
                      {p.nivel_clases === 'basicas' && (
                        <>
                          <li className="plan-benefit-item included">
                            <Check size={16} />
                            <span>Clases Fitness incluidas:</span>
                          </li>
                          {catalog.some((c) => c.categoria === 'basica') && (
                            <ul className="plan-benefit-sublist">
                              {catalog
                                .filter((c) => c.categoria === 'basica')
                                .map((c) => (
                                  <li key={c.id}>- {c.nombre}</li>
                                ))}
                            </ul>
                          )}
                          <li className="plan-benefit-item excluded">
                            <X size={16} />
                            <span>Sin clases especializadas</span>
                          </li>
                        </>
                      )}
                      {p.nivel_clases === 'todas' && (
                        <>
                          <li className="plan-benefit-item included">
                            <Check size={16} />
                            <span>Todas las clases fitness incluidas</span>
                          </li>
                          <li className="plan-benefit-item included">
                            <Check size={16} />
                            <span style={{ fontWeight: 600 }}>Clases Especializadas:</span>
                          </li>
                          {catalog.some((c) => c.categoria === 'especializada') && (
                            <ul className="plan-benefit-sublist">
                              {catalog
                                .filter((c) => c.categoria === 'especializada')
                                .map((c) => (
                                  <li key={c.id}>- {c.nombre}</li>
                                ))}
                            </ul>
                          )}
                        </>
                      )}
                      {(!p.nivel_clases || p.nivel_clases === 'ninguna') && (
                        <li className="plan-benefit-item excluded">
                          <X size={16} />
                          <span>Sin acceso a clases</span>
                        </li>
                      )}
                    </ul>

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

            <div style={{ marginTop: '24px', padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.825rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={16} color="#16a34a" /> Pagos seguros con <strong>Culqi</strong> (Tarjetas, Yape y PagoEfectivo). Emisión electrónica oficial <strong>SUNAT</strong> (Boleta / Factura UBL 2.1).</span>
              <span>Membresías de uso personal e intransferible. <strong>Sin devoluciones ni reembolsos</strong>.</span>
            </div>
          </div>
        )}

        <ClientQrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} />

        <PaymentSuccessModal
          isOpen={Boolean(successPaymentData)}
          onClose={() => setSuccessPaymentData(null)}
          data={successPaymentData}
        />

        {cancelTarget && (
          <div
            className="billing-modal-backdrop"
            onClick={() => !cancellingId && setCancelTarget(null)}
          >
            <div
              className="billing-modal-content"
              style={{ maxWidth: '460px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="billing-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} color="#dc2626" />
                  <h3>Confirmar Cancelación</h3>
                </div>
                <button
                  type="button"
                  className="billing-modal-close"
                  onClick={() => setCancelTarget(null)}
                  disabled={Boolean(cancellingId)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="billing-modal-body">
                <p style={{ margin: 0, fontSize: '0.925rem', color: '#334155', lineHeight: 1.5 }}>
                  ¿Estás seguro de que deseas cancelar tu membresía <strong>{cancelTarget.plan_name}</strong>?
                </p>

                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    lineHeight: 1.45,
                  }}
                >
                  Esta acción es irreversible, revocará tu acceso físico (QR y biométrico) de inmediato y, conforme a los Términos y Condiciones, no genera devolución ni reembolso.
                </div>
              </div>

              <div className="billing-modal-footer">
                <button
                  type="button"
                  className="btn-billing-cancel"
                  onClick={() => setCancelTarget(null)}
                  disabled={Boolean(cancellingId)}
                >
                  Mantener Activa
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelMembership(cancelTarget.id)}
                  disabled={Boolean(cancellingId)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: cancellingId ? 'not-allowed' : 'pointer',
                  }}
                >
                  {cancellingId ? 'Cancelando...' : 'Sí, Cancelar Membresía'}
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    );
  }

  // ==========================================
  // VISTA GERENTE (Historial y Analítica de Membresías)
  // ==========================================
  const getPaymentCategory = (m) => {
    if (!m.payment_method_id) {
      return m.amount_paid != null ? 'ONLINE' : 'NONE';
    }
    return m.payment_method_id === 'EFECTIVO' ? 'EFECTIVO' : 'ONLINE';
  };

  const formatPaymentMethodLabel = (m) => {
    if (!m.payment_method_id) {
      return m.amount_paid != null ? 'Online' : 'Sin registro';
    }
    if (m.payment_method_id === 'EFECTIVO') return 'Efectivo';
    if (m.payment_method_id === 'card') return 'Online (Tarjeta)';
    if (m.payment_method_id === 'yape') return 'Online (Yape)';
    return m.payment_method_id;
  };

  const filteredMemberships = memberships.filter((m) => {
    const query = searchTerm.toLowerCase();
    const fullName = `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase();
    const docNum = (m.numero_documento || '').toLowerCase();
    const docType = (m.tipo_documento || '').toLowerCase();
    const planName = (m.plan_name || '').toLowerCase();
    const id = (m.id || '').toLowerCase();

    const matchesSearch =
      fullName.includes(query) ||
      docNum.includes(query) ||
      docType.includes(query) ||
      planName.includes(query) ||
      id.includes(query);

    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const category = getPaymentCategory(m);
    const matchesMethod =
      paymentMethodFilter === 'ALL' ||
      (paymentMethodFilter === 'EFECTIVO' && category === 'EFECTIVO') ||
      (paymentMethodFilter === 'ONLINE' && category === 'ONLINE');

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Analíticas calculadas sobre el historial filtrado
  const analytics = filteredMemberships.reduce(
    (acc, m) => {
      const paid = m.amount_paid != null ? Number(m.amount_paid) : Number(m.plan_current_price || 0);
      const cat = getPaymentCategory(m);
      acc.totalAmount += paid;
      acc.totalCount += 1;
      if (cat === 'EFECTIVO') {
        acc.cashCount += 1;
        acc.cashAmount += paid;
      } else if (cat === 'ONLINE') {
        acc.onlineCount += 1;
        acc.onlineAmount += paid;
      }
      return acc;
    },
    { totalAmount: 0, totalCount: 0, cashCount: 0, cashAmount: 0, onlineCount: 0, onlineAmount: 0 }
  );

  const paidTotalCount = analytics.cashCount + analytics.onlineCount;
  const cashPct = paidTotalCount > 0 ? Math.round((analytics.cashCount / paidTotalCount) * 100) : 0;
  const onlinePct = paidTotalCount > 0 ? Math.round((analytics.onlineCount / paidTotalCount) * 100) : 0;

  return (
    <DashboardLayout title="Historial de Membresías">
      {/* Tarjetas de analítica rápida del historial */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Ingresos (Listado)
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              S/ {analytics.totalAmount.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
              {analytics.totalCount} {analytics.totalCount === 1 ? 'suscripción' : 'suscripciones'}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CreditCard size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Pagos Online
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              S/ {analytics.onlineAmount.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
              {analytics.onlineCount} pagos ({onlinePct}%)
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Banknote size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Efectivo en Mostrador
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              S/ {analytics.cashAmount.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
              {analytics.cashCount} pagos ({cashPct}%)
            </div>
          </div>
        </div>
      </div>

      <section className="action-bar memberships-bar">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Buscar por cliente, documento, plan o código..."
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

        <div className="status-filter-wrapper">
          <select
            className="status-filter-select"
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
          >
            <option value="ALL">Todos los métodos</option>
            <option value="ONLINE">Online</option>
            <option value="EFECTIVO">Efectivo en Mostrador</option>
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
                <th>N° Documento</th>
                <th>Plan</th>
                <th>Precio Pagado</th>
                <th>Método de Pago</th>
                <th>Vigencia</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMemberships.map((membership) => {
                const paidAmount =
                  membership.amount_paid != null
                    ? Number(membership.amount_paid)
                    : membership.plan_current_price != null
                      ? Number(membership.plan_current_price)
                      : null;
                const priceChanged =
                  membership.amount_paid != null &&
                  membership.plan_current_price != null &&
                  Number(membership.amount_paid) !== Number(membership.plan_current_price);
                const category = getPaymentCategory(membership);

                return (
                  <tr key={membership.id}>
                    <td>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.9375rem' }}>
                        {membership.first_name} {membership.last_name}
                      </strong>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        {membership.id}
                      </span>
                    </td>
                    <td className="text-muted">
                      {membership.numero_documento ? (
                        <>
                          <span style={{ fontWeight: 600, marginRight: '4px' }}>
                            {formatDocType(membership.tipo_documento)}:
                          </span>
                          {membership.numero_documento}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <strong style={{ color: '#1e293b' }}>
                        {membership.plan_name}
                      </strong>
                    </td>
                    <td>
                      {paidAmount != null ? (
                        <div>
                          <strong style={{ color: '#0f172a' }}>
                            S/ {paidAmount.toFixed(2)}
                          </strong>
                          {priceChanged && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>
                              Precio actual: S/ {Number(membership.plan_current_price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          fontSize: '0.775rem',
                          fontWeight: 600,
                          backgroundColor:
                            category === 'EFECTIVO'
                              ? '#f0fdf4'
                              : category === 'ONLINE'
                                ? '#eff6ff'
                                : '#f1f5f9',
                          color:
                            category === 'EFECTIVO'
                              ? '#15803d'
                              : category === 'ONLINE'
                                ? '#1d4ed8'
                                : '#64748b',
                        }}
                      >
                        {category === 'EFECTIVO' ? (
                          <Banknote size={13} />
                        ) : category === 'ONLINE' ? (
                          <CreditCard size={13} />
                        ) : null}
                        <span>{formatPaymentMethodLabel(membership)}</span>
                      </span>
                      {membership.registered_by_first_name && (
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          Por: {membership.registered_by_first_name} {membership.registered_by_last_name}
                        </span>
                      )}
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.84rem' }}>
                      {formatDate(membership.start_date)} - {formatDate(membership.end_date)}
                    </td>
                    <td>{getStatusBadge(membership.status)}</td>
                    <td className="text-right">
                      {membership.status === 'ACTIVE' && (
                        <button
                          type="button"
                          className="btn-cancel-membership"
                          onClick={() => setCancelTarget(membership)}
                          title="Cancelar membresía activa"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredMemberships.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-state">
                    No se encontraron membresías.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <ClientQrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} />

      <PaymentSuccessModal
        isOpen={Boolean(successPaymentData)}
        onClose={() => setSuccessPaymentData(null)}
        data={successPaymentData}
      />

      {cancelTarget && (
        <div
          className="billing-modal-backdrop"
          onClick={() => !cancellingId && setCancelTarget(null)}
        >
          <div
            className="billing-modal-content"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="billing-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="#dc2626" />
                <h3>Confirmar Cancelación</h3>
              </div>
              <button
                type="button"
                className="billing-modal-close"
                onClick={() => setCancelTarget(null)}
                disabled={Boolean(cancellingId)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="billing-modal-body">
              <p style={{ margin: 0, fontSize: '0.925rem', color: '#334155', lineHeight: 1.5 }}>
                {isClient ? (
                  <>
                    ¿Estás seguro de que deseas cancelar tu membresía <strong>{cancelTarget.plan_name}</strong>?
                  </>
                ) : (
                  <>
                    ¿Estás seguro de cancelar la membresía <strong>{cancelTarget.plan_name}</strong> de{' '}
                    <strong>{cancelTarget.first_name} {cancelTarget.last_name}</strong>?
                  </>
                )}
              </p>

              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  lineHeight: 1.45,
                }}
              >
                Esta acción es irreversible, revocará el acceso físico (QR y biométrico) de inmediato y, conforme a los Términos y Condiciones, no genera devolución ni reembolso.
              </div>
            </div>

            <div className="billing-modal-footer">
              <button
                type="button"
                className="btn-billing-cancel"
                onClick={() => setCancelTarget(null)}
                disabled={Boolean(cancellingId)}
              >
                Mantener Activa
              </button>
              <button
                type="button"
                onClick={() => handleCancelMembership(cancelTarget.id)}
                disabled={Boolean(cancellingId)}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: cancellingId ? 'not-allowed' : 'pointer',
                }}
              >
                {cancellingId ? 'Cancelando...' : 'Sí, Cancelar Membresía'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}