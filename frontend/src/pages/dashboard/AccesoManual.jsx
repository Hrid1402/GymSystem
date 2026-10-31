import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { accessApi } from '../../api';
import { sanitizeDigitsOnly } from '../../utils/validators';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/accessControl.css';

// Audio sintético para feedback auditivo inmediato en recepción
const playAudioFeedback = (type = 'success') => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Tono agudo A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime); // Tono grave A3
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.38);
    }
  } catch {
    // Si la política de autoplay del navegador lo bloquea, se ignora silenciosamente
  }
};

export default function AccesoManual() {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'dni'
  const [dniInput, setDniInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState(null); // { success, status, isReentry, client, membership, error, timestamp, entryMethod }
  const [stats, setStats] = useState({ totalVisits: 0, uniqueClients: 0 });

  // Cámara / Escáner
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const isScanningBlockedRef = useRef(false);
  const autoClearTimerRef = useRef(null);

  // Cargar estadísticas del día
  const loadStats = useCallback(async () => {
    try {
      const data = await accessApi.getTodayStats();
      setStats({
        totalVisits: data.totalVisits ?? data.total_visits ?? 0,
        uniqueClients: data.uniqueClients ?? data.unique_clients ?? 0,
      });
    } catch {
      // Ignorar error si no está disponible
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Manejar el resultado de la validación
  const handleValidationResult = useCallback((res) => {
    setResult(res);
    loadStats();

    if (res.success) {
      playAudioFeedback('success');
    } else {
      playAudioFeedback('error');
    }

    // Auto-limpiar resultado después de 9 segundos si no hay otra acción
    if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
    autoClearTimerRef.current = setTimeout(() => {
      setResult(null);
    }, 9000);
  }, [loadStats]);

  // Validar por DNI
  const handleDniSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanDni = dniInput.trim();
    if (cleanDni.length !== 8) return;

    setValidating(true);
    try {
      const res = await accessApi.validateAccess({ dni: cleanDni });
      handleValidationResult(res);
      setDniInput('');
    } catch (err) {
      handleValidationResult({
        success: false,
        status: 'DENIED',
        error: err.message || 'Error al validar acceso por DNI',
        entryMethod: 'manual_dni',
        dniAttempt: cleanDni,
      });
    } finally {
      setValidating(false);
    }
  };

  // Validar por QR (escaneado)
  const handleQrDetected = useCallback(async (token) => {
    if (isScanningBlockedRef.current) return;
    isScanningBlockedRef.current = true;
    setValidating(true);

    try {
      const res = await accessApi.validateAccess({ qrToken: token });
      handleValidationResult(res);
    } catch (err) {
      handleValidationResult({
        success: false,
        status: 'DENIED',
        error: err.message || 'Código QR no válido o expirado',
        entryMethod: 'qr',
      });
    } finally {
      setValidating(false);
      // Cooldown de 3.5 segundos para no volver a leer el mismo código instantáneamente
      setTimeout(() => {
        isScanningBlockedRef.current = false;
      }, 3500);
    }
  }, [handleValidationResult]);

  // Iniciar cámara
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader-viewport');
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleQrDetected(decodedText);
        },
        () => {
          // Ignorar errores de escaneo de cuadros individuales
        }
      );
      setCameraActive(true);
    } catch (err) {
      setCameraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
      setCameraActive(false);
    }
  }, [handleQrDetected]);

  // Detener cámara
  const stopCamera = useCallback(async () => {
    if (scannerRef.current && cameraActive) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignorar
      }
      setCameraActive(false);
    }
  }, [cameraActive]);

  // Ciclo de vida de la cámara con pestaña
  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      if (scannerRef.current && cameraActive) {
        scannerRef.current.stop().catch(() => {});
      }
      if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
    };
  }, [activeTab]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
  };

  const formatTime = (dateString) => {
    if (!dateString) return new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
    return new Date(dateString).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <DashboardLayout title="Control de Acceso al Gimnasio">
      <div className="access-terminal-container">
        {/* Barra superior de afluencia */}
        <div className="access-stats-bar">
          <div className="access-stat-box">
            <div className="access-stat-icon-wrap visits">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="access-stat-info">
              <span className="access-stat-title">Visitas de Hoy</span>
              <span className="access-stat-number">{stats.totalVisits}</span>
            </div>
          </div>

          <div className="access-stat-box">
            <div className="access-stat-icon-wrap clients">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="access-stat-info">
              <span className="access-stat-title">Clientes Únicos</span>
              <span className="access-stat-number">{stats.uniqueClients}</span>
            </div>
          </div>
        </div>

        {/* Terminal Principal */}
        <div className="terminal-main-card">
          {/* Pestañas de Modo */}
          <div className="terminal-tabs-header">
            <button
              type="button"
              className={`terminal-tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
              onClick={() => setActiveTab('camera')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Escáner QR (Cámara)</span>
            </button>
            <button
              type="button"
              className={`terminal-tab-btn ${activeTab === 'dni' ? 'active' : ''}`}
              onClick={() => setActiveTab('dni')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                <line x1="7" y1="8" x2="17" y2="8"></line>
                <line x1="7" y1="12" x2="13" y2="12"></line>
              </svg>
              <span>Validación Manual por DNI</span>
            </button>
          </div>

          {/* Cuerpo */}
          <div className="terminal-body">
            {activeTab === 'camera' ? (
              <div className="scanner-container">
                <div className="scanner-viewport-box">
                  <div id="qr-reader-viewport"></div>
                  {cameraActive && (
                    <>
                      <div className="scanner-reticle"></div>
                      <div className="scanner-laser"></div>
                    </>
                  )}
                  {cameraError && (
                    <div style={{ color: '#f87171', padding: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
                      {cameraError}
                    </div>
                  )}
                </div>

                <div className="scanner-controls-row">
                  {cameraActive ? (
                    <button type="button" className="scanner-toggle-btn stop" onClick={stopCamera}>
                      Pausar cámara
                    </button>
                  ) : (
                    <button type="button" className="scanner-toggle-btn start" onClick={startCamera}>
                      Activar cámara
                    </button>
                  )}
                </div>
                <p className="scanner-hint">
                  Apunta la cámara al código QR dinámico que el cliente muestra en su teléfono.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDniSubmit} className="manual-dni-container">
                <div className="dni-input-group">
                  <label htmlFor="dniInput" className="dni-input-label">
                    Número de Documento (DNI)
                  </label>
                  <div className="dni-input-row">
                    <input
                      id="dniInput"
                      type="text"
                      className="dni-input-field"
                      placeholder="00000000"
                      maxLength={8}
                      value={dniInput}
                      onChange={(e) => setDniInput(sanitizeDigitsOnly(e.target.value, 8))}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="dni-submit-btn"
                      disabled={validating || dniInput.length !== 8}
                    >
                      {validating ? 'Validando...' : 'Validar'}
                    </button>
                  </div>
                </div>
                <p className="scanner-hint">
                  Ingresa los 8 dígitos del DNI del cliente y presiona Enter o el botón Validar.
                </p>
              </form>
            )}

            {/* TARJETAS DE RESULTADO (VERDE / AZUL / ROJA) */}
            {result && (
              <div
                className={`result-card-container ${
                  result.success
                    ? result.isReentry
                      ? 'reentry'
                      : 'granted'
                    : 'denied'
                }`}
                role="alert"
              >
                <div className="result-card-header">
                  <div className="result-icon-badge">
                    {result.success ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="28" height="28">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="28" height="28">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    )}
                  </div>
                  <div className="result-header-text">
                    <h2 className="result-main-title">
                      {result.success
                        ? result.isReentry
                          ? 'REINGRESO PERMITIDO'
                          : 'ACCESO CONCEDIDO'
                        : 'ACCESO DENEGADO'}
                    </h2>
                    <p className="result-sub-title">
                      {result.success
                        ? result.isReentry
                          ? 'Visita adicional registrada en el día de hoy'
                          : 'Primera visita del día registrada con éxito'
                        : result.error || 'No cumple las condiciones de acceso'}
                    </p>
                  </div>
                </div>

                {/* Detalles si el cliente fue identificado */}
                {(result.client || result.membership) && (
                  <div className="result-details-box">
                    {result.client?.fullName && (
                      <div className="result-detail-item">
                        <span className="result-detail-key">Cliente</span>
                        <span className="result-detail-val">{result.client.fullName}</span>
                      </div>
                    )}
                    {result.client?.dni && (
                      <div className="result-detail-item">
                        <span className="result-detail-key">DNI</span>
                        <span className="result-detail-val">{result.client.dni}</span>
                      </div>
                    )}
                    {result.membership?.planName && (
                      <div className="result-detail-item">
                        <span className="result-detail-key">Plan</span>
                        <span className="result-detail-val">{result.membership.planName}</span>
                      </div>
                    )}
                    {result.membership?.endDate && (
                      <div className="result-detail-item">
                        <span className="result-detail-key">Vence</span>
                        <span className="result-detail-val">{formatDate(result.membership.endDate)}</span>
                      </div>
                    )}
                    <div className="result-detail-item">
                      <span className="result-detail-key">Hora de Ingreso</span>
                      <span className="result-detail-val">{formatTime(result.attendance?.createdAt)}</span>
                    </div>
                    <div className="result-detail-item">
                      <span className="result-detail-key">Método</span>
                      <span className="result-detail-val">
                        {result.attendance?.entryMethod === 'manual_dni' || result.entryMethod === 'manual_dni'
                          ? 'DNI Manual'
                          : 'QR Dinámico'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="result-footer-actions">
                  <button
                    type="button"
                    className="result-next-btn"
                    onClick={() => setResult(null)}
                  >
                    Siguiente Cliente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
