import { Html5Qrcode } from 'html5-qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usersApi } from '../../api/usersApi';
import Loader from '../../components/common/Loader';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/accessControl.css';
import '../../styles/clientQrModal.css';
import '../../styles/users.css';

const SCANNER_VIEWPORT_ID = 'trainer-qr-viewport';

function extractClientId(rawText) {
  const clean = String(rawText || '').trim();
  if (!clean) return '';
  if (clean.startsWith('GYMSTARK_CLIENT:')) {
    return clean.replace('GYMSTARK_CLIENT:', '').trim();
  }
  return clean;
}

export default function EscanerQr() {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [docType, setDocType] = useState('dni');
  const [docNumber, setDocNumber] = useState('');
  const [validating, setValidating] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [result, setResult] = useState(null);

  const scannerRef = useRef(null);
  const transitionRef = useRef(Promise.resolve());
  const isScanningBlockedRef = useRef(false);
  const isUnmountedRef = useRef(false);

  const stopCamera = useCallback(() => {
    transitionRef.current = transitionRef.current.then(async () => {
      const scanner = scannerRef.current;
      if (scanner && scanner.isScanning) {
        try {
          await scanner.stop();
        } catch (err) {
          console.warn('Error al detener la cámara:', err);
        }
      }
      if (!isUnmountedRef.current) {
        setCameraActive(false);
      }
    });
    return transitionRef.current;
  }, []);

  const lookupByQr = useCallback(
    async (rawText) => {
      const clientId = extractClientId(rawText);
      if (!clientId) {
        setLookupError('El código QR no contiene un identificador de cliente válido.');
        return;
      }

      if (isScanningBlockedRef.current) return;
      isScanningBlockedRef.current = true;
      setValidating(true);
      setLookupError('');

      try {
        await stopCamera();
        const data = await usersApi.getClientTrainerSummary(clientId);
        if (!isUnmountedRef.current) {
          setResult(data);
        }
      } catch (err) {
        if (!isUnmountedRef.current) {
          setLookupError(err.message || 'No se pudo obtener la información del cliente.');
        }
      } finally {
        if (!isUnmountedRef.current) {
          setValidating(false);
        }
        setTimeout(() => {
          isScanningBlockedRef.current = false;
        }, 1200);
      }
    },
    [stopCamera]
  );

  const startCamera = useCallback(() => {
    transitionRef.current = transitionRef.current.then(async () => {
      if (isUnmountedRef.current) return;

      const viewportEl = document.getElementById(SCANNER_VIEWPORT_ID);
      if (!viewportEl) return;

      setCameraError(null);

      try {
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(SCANNER_VIEWPORT_ID);
        }

        const scanner = scannerRef.current;
        if (!scanner.isScanning) {
          await scanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 240, height: 240 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              if (!isUnmountedRef.current) {
                lookupByQr(decodedText);
              }
            },
            () => {
              // Ignorar cuadros sin QR
            }
          );
        }

        if (!isUnmountedRef.current) {
          setCameraActive(true);
        }
      } catch (err) {
        console.warn('Error al iniciar cámara:', err);
        if (!isUnmountedRef.current) {
          setCameraError(
            'No se pudo acceder a la cámara. Puedes buscar al cliente por su número de identidad.'
          );
          setCameraActive(false);
        }
      }
    });
    return transitionRef.current;
  }, [lookupByQr]);

  useEffect(() => {
    isUnmountedRef.current = false;
    startCamera();

    return () => {
      isUnmountedRef.current = true;
      transitionRef.current = transitionRef.current.then(async () => {
        const scanner = scannerRef.current;
        if (scanner) {
          try {
            if (scanner.isScanning) {
              await scanner.stop();
            }
            scanner.clear();
          } catch {
            // Ignorar al desmontar
          }
          scannerRef.current = null;
        }
      });
    };
  }, [startCamera]);

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    const cleanDoc = docNumber.trim();
    if (!cleanDoc || validating) return;

    isScanningBlockedRef.current = true;
    setValidating(true);
    setLookupError('');

    try {
      await stopCamera();
      const data = await usersApi.getClientTrainerSummaryByDocument({
        tipo_documento: docType,
        numero_documento: cleanDoc,
      });
      if (!isUnmountedRef.current) {
        setResult(data);
      }
    } catch (err) {
      if (!isUnmountedRef.current) {
        setLookupError(err.message || 'No se encontró un cliente con ese número de identidad.');
      }
    } finally {
      if (!isUnmountedRef.current) {
        setValidating(false);
      }
      setTimeout(() => {
        isScanningBlockedRef.current = false;
      }, 1200);
    }
  };

  const handleScanNext = () => {
    setResult(null);
    setLookupError('');
    setDocNumber('');
    startCamera();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const parts = String(dateString).split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
  };

  return (
    <DashboardLayout title="Escanear QR">
      <div className="access-terminal-container">
        <div className="terminal-main-card">
          <div className="terminal-body">
            {validating ? (
              <div style={{ padding: '36px 0' }}>
                <Loader text="Consultando datos del cliente..." />
              </div>
            ) : result ? (
              <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
                <div
                  className="qr-client-card"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      Cliente
                    </span>
                    <p
                      className="qr-client-name"
                      style={{ fontSize: '1.125rem', marginTop: '2px' }}
                    >
                      {result.client.first_name} {result.client.last_name}
                    </p>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      Documento
                    </span>
                    <p
                      className="qr-client-dni"
                      style={{
                        fontSize: '0.95rem',
                        marginTop: '2px',
                        color: '#1e293b',
                      }}
                    >
                      {result.client.tipo_documento === 'carnet_extranjeria'
                        ? 'C.E.'
                        : result.client.tipo_documento === 'pasaporte'
                          ? 'Pasaporte'
                          : 'DNI'}
                      : <strong>{result.client.numero_documento || '-'}</strong>
                    </p>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      paddingTop: '10px',
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      Membresía
                    </span>
                    {result.membership ? (
                      <div style={{ marginTop: '6px' }}>
                        <div
                          className="qr-membership-badge"
                          style={{ display: 'inline-flex' }}
                        >
                          <span className="qr-membership-dot"></span>
                          <span>{result.membership.plan_name}</span>
                        </div>
                        <p
                          style={{
                            fontSize: '0.8125rem',
                            color: '#475569',
                            marginTop: '6px',
                          }}
                        >
                          Vigente hasta:{' '}
                          <strong>{formatDate(result.membership.end_date)}</strong>
                        </p>
                      </div>
                    ) : (
                      <p
                        style={{
                          fontSize: '0.9rem',
                          color: '#dc2626',
                          fontWeight: 600,
                          marginTop: '4px',
                        }}
                      >
                        Sin membresía activa
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleScanNext}
                  style={{ marginTop: '16px', width: '100%' }}
                >
                  Volver
                </button>
              </div>
            ) : (
              <div className="scanner-container" style={{ display: 'flex' }}>
                <div className="scanner-viewport-box">
                  <div
                    id={SCANNER_VIEWPORT_ID}
                    style={{ width: '100%', height: '100%' }}
                  ></div>
                  {cameraActive && (
                    <>
                      <div className="scanner-reticle"></div>
                      <div className="scanner-laser"></div>
                    </>
                  )}
                  {cameraError && (
                    <div
                      style={{
                        color: '#f87171',
                        padding: '20px',
                        textAlign: 'center',
                        fontSize: '0.9rem',
                      }}
                    >
                      {cameraError}
                    </div>
                  )}
                </div>

                <div className="scanner-controls-row">
                  {cameraActive ? (
                    <button
                      type="button"
                      className="scanner-toggle-btn stop"
                      onClick={stopCamera}
                    >
                      Pausar cámara
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="scanner-toggle-btn start"
                      onClick={startCamera}
                    >
                      Activar cámara
                    </button>
                  )}
                </div>

                <p className="scanner-hint">
                  Escanea el QR del cliente o consúltalo ingresando su número de identidad.
                </p>

                {lookupError && (
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: '#b91c1c',
                      background: '#fef2f2',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginTop: '8px',
                      width: '100%',
                      maxWidth: '460px',
                    }}
                  >
                    {lookupError}
                  </p>
                )}

                <form
                  onSubmit={handleDocumentSubmit}
                  style={{
                    marginTop: '14px',
                    display: 'flex',
                    gap: '8px',
                    width: '100%',
                    maxWidth: '460px',
                  }}
                >
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    aria-label="Tipo de documento"
                    style={{
                      padding: '0.625rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                    }}
                  >
                    <option value="dni">DNI</option>
                    <option value="carnet_extranjeria">C.E.</option>
                    <option value="pasaporte">Pasaporte</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Número de identidad"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.625rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                    }}
                  />

                  <button type="submit" className="btn-secondary">
                    Buscar
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}