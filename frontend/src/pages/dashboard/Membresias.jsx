import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

export default function Membresias() {
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT';
  const [searchParams, setSearchParams] = useSearchParams();

  const [memberships, setMemberships] = useState([]);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [successPaymentData, setSuccessPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('mine'); // Para cliente: 'mine' | 'explore'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // Para staff
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
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
        setInvoices(invoicesRes?.invoices || []);
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
          order: res.order_id,
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
            bancaMovil: true,
            agente: false,
            billeteras: true,
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
                  {confirmCancelId === activeMembership.id ? (
                    <div className="cancel-confirmation-box">
                      <p>
                        ¿Estás seguro de cancelar tu membresía actual? Esta acción revocará tu acceso inmediatamente. Conforme a nuestros Términos y Condiciones, las membresías no admiten devoluciones ni reembolsos.
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
              <span>🔒 Pagos seguros con <strong>Culqi</strong> (Tarjetas, Yape y PagoEfectivo). Emisión electrónica oficial <strong>SUNAT</strong> (Boleta / Factura UBL 2.1).</span>
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
      </DashboardLayout>
    );
  }

  // ==========================================
  // VISTA STAFF (Gerente y Recepcionista)
  // ==========================================
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

      <ClientQrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} />
    </DashboardLayout>
  );
}