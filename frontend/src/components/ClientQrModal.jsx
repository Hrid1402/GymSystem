import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { accessApi } from '../api';
import { PATHS } from '../routes/paths';
import Loader from './common/Loader';
import '../styles/clientQrModal.css';

export default function ClientQrModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const totalDurationRef = useRef(90);
  const timerRef = useRef(null);

  const fetchQr = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else if (!qrData) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await accessApi.getMyQr();
      setQrData(res);
      const duration = res.expiresInSeconds || 90;
      totalDurationRef.current = duration;
      setTimeLeft(duration);
    } catch (err) {
      setError(err.message || 'No se pudo generar el código de acceso');
      setQrData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [qrData]);

  // Cargar QR al abrir modal
  useEffect(() => {
    if (isOpen) {
      fetchQr();
    } else {
      // Limpiar al cerrar
      if (timerRef.current) clearInterval(timerRef.current);
      setQrData(null);
      setError(null);
      setTimeLeft(90);
    }
  }, [isOpen, fetchQr]);

  // Temporizador de cuenta regresiva
  useEffect(() => {
    if (!isOpen || !qrData || loading) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Expiró el ciclo: auto-renovar silenciosamente
          fetchQr(true);
          return totalDurationRef.current;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, qrData, loading, fetchQr]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleGoToPlans = () => {
    onClose();
    navigate(PATHS.MEMBERSHIPS);
  };

  const progressPercentage = Math.max(0, Math.min(100, (timeLeft / totalDurationRef.current) * 100));

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="qr-modal-container" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="qr-modal-header">
          <div className="qr-modal-title-wrap">
            <svg
              className="qr-modal-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <h2 className="qr-modal-title">Mi Código de Acceso</h2>
          </div>
          <button
            type="button"
            className="qr-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="qr-modal-body">
          {loading ? (
            <div style={{ padding: '40px 0' }}>
              <Loader text="Generando pase de acceso..." />
            </div>
          ) : error ? (
            <div className="qr-empty-box">
              <div className="qr-empty-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3 className="qr-empty-title">Acceso no disponible</h3>
              <p className="qr-empty-desc">
                {error.includes('membresía')
                  ? 'Para generar tu código QR dinámico de ingreso, necesitas contar con una membresía activa.'
                  : error}
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={handleGoToPlans}
                style={{ width: '100%', maxWidth: '240px' }}
              >
                Ver planes de membresía
              </button>
            </div>
          ) : qrData ? (
            <>
              {/* Tarjeta de identificación del cliente */}
              <div className="qr-client-card">
                <div className="qr-client-meta">
                  <p className="qr-client-name">
                    {qrData.user.firstName} {qrData.user.lastName}
                  </p>
                  <p className="qr-client-dni">DNI: {qrData.user.dni}</p>
                </div>
                <div className="qr-membership-badge">
                  <span className="qr-membership-dot"></span>
                  <span>{qrData.membership.planName}</span>
                </div>
              </div>

              {/* Contenedor del Código QR */}
              <div className={`qr-canvas-box ${refreshing ? 'refreshing' : ''}`}>
                <QRCodeSVG
                  value={qrData.token}
                  size={210}
                  level="M"
                  includeMargin={true}
                />
              </div>

              {/* Barra de progreso y temporizador */}
              <div className="qr-timer-section">
                <div className="qr-timer-label-row">
                  <span>Actualización automática</span>
                  <span className="qr-timer-count">{timeLeft}s</span>
                </div>
                <div className="qr-progress-track">
                  <div
                    className={`qr-progress-bar ${timeLeft <= 15 ? 'expiring' : ''}`}
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Botón manual de actualización */}
              <button
                type="button"
                className="qr-refresh-action"
                onClick={() => fetchQr(true)}
                disabled={refreshing}
                title="Generar un nuevo código de acceso inmediatamente"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="14"
                  height="14"
                  style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
                >
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>{refreshing ? 'Actualizando...' : 'Actualizar ahora'}</span>
              </button>

              {/* Nota de instrucciones y seguridad */}
              <div className="qr-instructions-box">
                <svg
                  className="qr-instructions-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <p className="qr-instructions-text">
                  Presenta este código frente al escáner en la recepción del gimnasio. Por tu seguridad, se renueva continuamente y es de uso exclusivo y personal.
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
