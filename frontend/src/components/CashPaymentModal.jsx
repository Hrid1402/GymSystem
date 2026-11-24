import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Check,
  FileText,
  Search,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '../api/usersApi';
import { paymentsApi } from '../api/paymentsApi';
import '../styles/billingModal.css';

export default function CashPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  plans = [],
  memberships = [],
  preselectedClientId = null,
}) {
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [thirdPartyDoc, setThirdPartyDoc] = useState('');
  const [thirdPartyName, setThirdPartyName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar clientes activos cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setSubmitting(false);
    setClientSearchQuery('');
    setIsThirdParty(false);
    setThirdPartyDoc('');
    setThirdPartyName('');

    // Preseleccionar plan por defecto
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }

    // Inicializar cliente: sólo preseleccionar si se pasó explícitamente preselectedClientId
    if (preselectedClientId) {
      setSelectedClientId(preselectedClientId);
    } else {
      setSelectedClientId('');
    }

    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const res = await usersApi.getUsers({ role: 'CLIENT', is_active: true });
        const clientList = res?.users || res?.data || [];
        setClients(clientList);
      } catch (err) {
        console.error('Error al cargar lista de clientes:', err);
        setErrorMsg('No se pudo cargar la lista de clientes.');
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, [isOpen, preselectedClientId]);

  // Cliente seleccionado actual
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Filtrado de clientes en tiempo real para búsqueda rápida en mostrador
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) {
      return clients.slice(0, 6);
    }
    const q = clientSearchQuery.toLowerCase().trim();
    return clients.filter((c) => {
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      const doc = (c.numero_documento || c.dni || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return fullName.includes(q) || doc.includes(q) || email.includes(q);
    });
  }, [clients, clientSearchQuery]);

  // Validación anti-duplicados en frontend: verificar si el cliente ya tiene una membresía activa
  const activeMembershipOfClient = memberships.find(
    (m) => m.user_id === selectedClientId && m.status === 'ACTIVE'
  );

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId);
    setClientSearchQuery('');
    setErrorMsg('');
  };

  const handleClearClient = () => {
    setSelectedClientId('');
    setClientSearchQuery('');
    setIsThirdParty(false);
    setThirdPartyDoc('');
    setThirdPartyName('');
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedClientId || !selectedClient) {
      setErrorMsg('Debes seleccionar un cliente.');
      return;
    }

    if (!selectedPlanId || !selectedPlan) {
      setErrorMsg('Debes seleccionar un plan comercial válido.');
      return;
    }

    if (activeMembershipOfClient) {
      setErrorMsg(
        `El cliente ya cuenta con una membresía activa (${activeMembershipOfClient.plan_name}) vigente hasta el ${formatDate(
          activeMembershipOfClient.end_date
        )}. No es posible registrar un nuevo cobro.`
      );
      return;
    }

    // Configuración de datos del comprobante electrónico
    let billingDetails = null;
    if (isThirdParty) {
      if (!thirdPartyDoc.trim()) {
        setErrorMsg('Ingresa el DNI o documento del pagador / familiar.');
        return;
      }
      if (!thirdPartyName.trim()) {
        setErrorMsg('Ingresa el nombre completo del pagador / familiar.');
        return;
      }
      billingDetails = {
        tipo_doc: '03',
        num_doc: thirdPartyDoc.trim(),
        rzn_social: thirdPartyName.trim(),
      };
    } else {
      // Por defecto: datos del mismo cliente registrado
      billingDetails = {
        tipo_doc: '03',
        num_doc: selectedClient.numero_documento || selectedClient.dni || '00000000',
        rzn_social: `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim() || 'CLIENTE GYMSTARK',
      };
    }

    setSubmitting(true);
    try {
      const res = await paymentsApi.cashCharge({
        client_id: selectedClientId,
        plan_id: selectedPlanId,
        billing_details: billingDetails,
      });

      toast.success('Cobro en efectivo registrado y membresía activada con éxito.');
      onSuccess?.({
        membership: res.membership,
        invoice: res.invoice,
        plan: selectedPlan,
      });
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Error al procesar el cobro en efectivo en el servidor.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="billing-modal-backdrop" onClick={onClose}>
      <div
        className="billing-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <div className="billing-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Banknote size={20} color="#16a34a" />
            <h3>Registrar Cobro en Efectivo</h3>
          </div>
          <button type="button" className="billing-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="billing-modal-body">
            {errorMsg && (
              <div className="pos-error-callout">
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Sección de Selección o Búsqueda de Cliente */}
            <div className="billing-field-group">
              <label>Cliente Beneficiario *</label>

              {selectedClient ? (
                <div className="pos-client-card">
                  <div className="pos-client-info">
                    <div className="pos-client-avatar">
                      <User size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="pos-client-name">
                        {selectedClient.first_name} {selectedClient.last_name}
                      </div>
                      <div className="pos-client-meta">
                        <span>Doc: {selectedClient.numero_documento || selectedClient.dni || 'No registrado'}</span>
                        <span>·</span>
                        <span>{selectedClient.email}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pos-client-change-btn"
                    onClick={handleClearClient}
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="pos-client-search">
                  <div className="pos-search-input-wrap">
                    <Search size={16} className="pos-search-icon" />
                    <input
                      type="text"
                      className="pos-search-input"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder="Buscar cliente por DNI, nombre o correo..."
                      autoFocus
                      disabled={loadingClients}
                    />
                    {clientSearchQuery && (
                      <button
                        type="button"
                        className="pos-search-clear-btn"
                        onClick={() => setClientSearchQuery('')}
                        title="Borrar búsqueda"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="pos-client-results-list">
                    {loadingClients ? (
                      <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                        Cargando clientes...
                      </div>
                    ) : filteredClients.length === 0 ? (
                      <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                        No se encontraron clientes activos coincidentes
                      </div>
                    ) : (
                      filteredClients.map((c) => {
                        const activeMem = memberships.find((m) => m.user_id === c.id && m.status === 'ACTIVE');
                        const isBlocked = Boolean(activeMem);

                        return (
                          <div
                            key={c.id}
                            className={`pos-client-result-item ${isBlocked ? 'has-plan' : ''}`}
                            onClick={() => handleSelectClient(c.id)}
                            title={isBlocked ? `Tiene membresía activa (${activeMem.plan_name}). Haz clic para ver detalles.` : 'Seleccionar cliente'}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: isBlocked ? '#991b1b' : '#0f172a' }}>
                                  {c.first_name} {c.last_name}
                                </span>
                                {isBlocked && (
                                  <span className="pos-chip-blocked">
                                    Plan Activo
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                Doc: {c.numero_documento || c.dni || 'Sin Doc'} · {c.email}
                              </div>
                            </div>

                            {isBlocked ? (
                              <span className="pos-btn-blocked">
                                Con Plan Activo
                              </span>
                            ) : (
                              <span className="pos-btn-select">
                                Seleccionar
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Alerta de bloqueo preventivo anti-duplicados */}
            {activeMembershipOfClient && (
              <div className="pos-warning-callout">
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#b45309' }} />
                <div>
                  <strong>Membresía activa vigente:</strong> El cliente ya tiene el plan{' '}
                  <em>{activeMembershipOfClient.plan_name}</em> activo hasta el{' '}
                  <strong>{formatDate(activeMembershipOfClient.end_date)}</strong>. No es posible registrar otro cobro mientras esté vigente.
                </div>
              </div>
            )}

            {/* Selector de Plan */}
            <div className="billing-field-group">
              <label>Plan a Adquirir</label>
              <select
                className="status-filter-select"
                style={{ width: '100%' }}
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                disabled={submitting}
                required
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - S/ {Number(p.price).toFixed(2)} PEN ({p.duration_days} días)
                  </option>
                ))}
              </select>
            </div>

            {/* Resumen de Monto a Cobrar en Efectivo */}
            {selectedPlan && (
              <div className="pos-summary-card">
                <div>
                  <div className="pos-summary-amount-label">
                    Total a cobrar en efectivo
                  </div>
                  <div className="pos-summary-amount">
                    S/ {Number(selectedPlan.price).toFixed(2)} PEN
                  </div>
                </div>
                <div className="pos-badge-cash">
                  <Banknote size={16} />
                  <span>Efectivo en Mostrador</span>
                </div>
              </div>
            )}

            {/* Comprobante Electrónico SUNAT - Boleta de Venta */}
            <div className="pos-boleta-banner">
              <div className="pos-boleta-banner-left">
                <FileText size={18} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Boleta de Venta Electrónica (B001)</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.85, marginTop: '1px' }}>
                    {selectedClient ? (
                      isThirdParty ? (
                        <>Emitida a nombre del pagador / familiar indicado</>
                      ) : (
                        <>
                          A nombre de: <strong>{selectedClient.first_name} {selectedClient.last_name}</strong> (DNI: {selectedClient.numero_documento || selectedClient.dni || 'Sin Doc'})
                        </>
                      )
                    ) : (
                      <>Se emitirá con los datos del cliente seleccionado</>
                    )}
                  </div>
                </div>
              </div>
              <span className="pos-sunat-badge" style={{ flexShrink: 0 }}>SUNAT UBL 2.1</span>
            </div>

            {/* Opción para emitir a nombre de otra persona (Familiar / Acompañante) */}
            <div>
              <label className="pos-thirdparty-toggle">
                <input
                  type="checkbox"
                  checked={isThirdParty}
                  onChange={(e) => setIsThirdParty(e.target.checked)}
                  disabled={submitting || !selectedClientId}
                />
                <span>Emitir comprobante a nombre de otra persona (familiar / acompañante)</span>
              </label>

              {isThirdParty && (
                <div className="pos-thirdparty-box">
                  <div className="pos-thirdparty-hint">
                    La membresía y el acceso biométrico/QR se asignarán al cliente seleccionado, pero la Boleta de Venta electrónica saldrá con los datos de la persona que realiza el pago:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                    <div className="billing-field-group">
                      <label>DNI / Doc. Pagador *</label>
                      <input
                        type="text"
                        value={thirdPartyDoc}
                        onChange={(e) => setThirdPartyDoc(e.target.value)}
                        placeholder="72345678"
                        disabled={submitting}
                        required
                      />
                    </div>
                    <div className="billing-field-group">
                      <label>Nombres y Apellidos Pagador *</label>
                      <input
                        type="text"
                        value={thirdPartyName}
                        onChange={(e) => setThirdPartyName(e.target.value)}
                        placeholder="Ej. Juan Pérez (Padre)"
                        disabled={submitting}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="billing-modal-footer">
            <button
              type="button"
              className="btn-billing-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-billing-submit"
              disabled={
                Boolean(activeMembershipOfClient) ||
                submitting ||
                !selectedClientId ||
                !selectedPlanId
              }
            >
              {submitting ? (
                'Procesando...'
              ) : activeMembershipOfClient ? (
                'Cliente con Plan Activo'
              ) : (
                <>
                  <Check size={18} />
                  <span>Registrar Cobro</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
