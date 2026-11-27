import Human from '@vladmandic/human';
import { Check, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { accessApi } from '../../api/accessApi';
import Loader from '../../components/common/Loader';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/acceso.css';

const baseHumanConfig = {
  backend: 'webgl',
  modelBasePath: '/models',
  face: {
    enabled: true,
    detector: { rotation: true, maxFaces: 1, return: true },
    embedding: { enabled: true },
  },
  body: { enabled: false },
  hand: { enabled: false },
};

const REQUIRED_STABLE_FRAMES = 2;
const MIN_FACE_SCORE = 0.55;
const MIN_WIDTH_RATIO = 0.18;
const MAX_WIDTH_RATIO = 0.78;
const MIN_HEIGHT_RATIO = 0.22;
const MAX_HEIGHT_RATIO = 0.85;
const MAX_ANGLE_RAD = 0.50;

function normalizeAngles(face) {
  const raw = face?.rotation?.angle || face?.angle || {};
  const yaw = typeof raw.yaw === 'number' ? raw.yaw : 0;
  const pitch = typeof raw.pitch === 'number' ? raw.pitch : 0;
  const roll = typeof raw.roll === 'number' ? raw.roll : 0;
  const maxAbs = Math.max(Math.abs(yaw), Math.abs(pitch), Math.abs(roll));
  if (maxAbs > 3.5) {
    return {
      yaw: (yaw * Math.PI) / 180,
      pitch: (pitch * Math.PI) / 180,
      roll: (roll * Math.PI) / 180,
    };
  }
  return { yaw, pitch, roll };
}

function isValidEmbeddingArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  let normSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    if (typeof val !== 'number' || !Number.isFinite(val)) return false;
    normSq += val * val;
  }
  return normSq > 0;
}

function evaluateFaceForExit(face, videoWidth, videoHeight) {
  if (!face || (!Array.isArray(face.embedding) && !(face.embedding instanceof Float32Array))) {
    return { ok: false, reason: 'No se pudo leer el rostro.' };
  }

  const score = typeof face.score === 'number' ? face.score : 1;
  if (score < MIN_FACE_SCORE) {
    return { ok: false, reason: 'Acércate o mejora la luz para reconocer el rostro.' };
  }

  const box = Array.isArray(face.box) && face.box.length === 4
    ? face.box
    : (Array.isArray(face.boxRaw) && face.boxRaw.length === 4
      ? [
          face.boxRaw[0] * videoWidth,
          face.boxRaw[1] * videoHeight,
          face.boxRaw[2] * videoWidth,
          face.boxRaw[3] * videoHeight,
        ]
      : null);

  if (box && videoWidth && videoHeight) {
    const [bx, by, bw, bh] = box;
    const widthRatio = bw / videoWidth;
    const heightRatio = bh / videoHeight;
    const centerX = (bx + bw / 2) / videoWidth;
    const centerY = (by + bh / 2) / videoHeight;

    if (widthRatio < MIN_WIDTH_RATIO || heightRatio < MIN_HEIGHT_RATIO) {
      return { ok: false, reason: 'Acércate un poco más a la cámara.' };
    }
    if (widthRatio > MAX_WIDTH_RATIO || heightRatio > MAX_HEIGHT_RATIO) {
      return { ok: false, reason: 'Aléjate un poco de la cámara.' };
    }
    if (centerX < 0.20 || centerX > 0.80 || centerY < 0.15 || centerY > 0.85) {
      return { ok: false, reason: 'Ubica tu rostro más al centro.' };
    }
  }

  const { yaw, pitch, roll } = normalizeAngles(face);
  if (Math.abs(yaw) > MAX_ANGLE_RAD || Math.abs(pitch) > MAX_ANGLE_RAD || Math.abs(roll) > MAX_ANGLE_RAD) {
    return { ok: false, reason: 'Mira más de frente hacia la cámara.' };
  }

  const embedding = Array.from(face.embedding);
  if (!isValidEmbeddingArray(embedding)) {
    return { ok: false, reason: 'Descriptor facial no válido, reintentando...' };
  }

  return { ok: true, score, embedding };
}

export default function SalidaFacial() {
  const videoRef = useRef(null);
  const [scanStatus, setScanStatus] = useState('Cargando cámara e IA...');
  const [identifiedClient, setIdentifiedClient] = useState(null);
  const [exitResult, setExitResult] = useState(null);
  const [errorReason, setErrorReason] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const isScanningRef = useRef(true);
  const isDetectingRef = useRef(false);
  const stableSamplesRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    let stream = null;
    let interval = null;
    let isMounted = true;
    let humanInstance = new Human(baseHumanConfig);
    let isReinitializingEngine = false;

    isScanningRef.current = true;
    isDetectingRef.current = false;
    stableSamplesRef.current = [];

    const setupEngine = async (forceWasm = false) => {
      const cfg = forceWasm ? { ...baseHumanConfig, backend: 'wasm' } : baseHumanConfig;
      humanInstance = new Human(cfg);
      await humanInstance.load();
      if (!isMounted) return;
      await humanInstance.warmup();
    };

    const initCamera = async () => {
      try {
        setScanStatus('Cargando modelos de IA y optimizando GPU...');
        try {
          await setupEngine(false);
        } catch (gpuErr) {
          console.warn('[SalidaFacial] Falló WebGL al iniciar, cambiando a WASM:', gpuErr);
          if (!isMounted) return;
          setScanStatus('Optimizando motor de IA en modo compatible...');
          await setupEngine(true);
        }
        if (!isMounted) return;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('El navegador no soporta acceso a la cámara (requiere HTTPS o localhost).');
        }

        setScanStatus('Iniciando cámara...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          try {
            await videoEl.play();
          } catch (e) {
            console.warn('[SalidaFacial] Play inicial pendiente:', e);
          }
        }

        if (!isMounted) return;
        setIsReady(true);
        isScanningRef.current = true;
        setScanStatus('Escaneando rostros para salida...');

        interval = setInterval(async () => {
          const el = videoRef.current;
          if (
            !isMounted ||
            !isScanningRef.current ||
            isDetectingRef.current ||
            isReinitializingEngine ||
            !el
          ) {
            return;
          }

          if (el.paused || el.ended || el.readyState < 2 || !el.videoWidth || !el.videoHeight) {
            setScanStatus('Esperando flujo de video de la cámara...');
            try {
              if (el.srcObject && el.paused) {
                await el.play();
              }
            } catch {
              // Ignora si aún no está listo
            }
            return;
          }

          isDetectingRef.current = true;
          try {
            const vw = el.videoWidth;
            const vh = el.videoHeight;
            const result = await humanInstance.detect(el);

            if (!isMounted || !isScanningRef.current) return;

            if (!result.face || result.face.length === 0) {
              stableSamplesRef.current = [];
              setScanStatus('Escaneando rostros para salida...');
              return;
            }

            if (result.face.length > 1) {
              stableSamplesRef.current = [];
              setScanStatus('Solo debe haber una persona frente a la cámara.');
              return;
            }

            const check = evaluateFaceForExit(result.face[0], vw, vh);
            if (!check.ok) {
              stableSamplesRef.current = [];
              setScanStatus(check.reason);
              return;
            }

            stableSamplesRef.current.push(check);
            if (stableSamplesRef.current.length < REQUIRED_STABLE_FRAMES) {
              setScanStatus(`Reconociendo rostro... (${stableSamplesRef.current.length}/${REQUIRED_STABLE_FRAMES})`);
              return;
            }

            let best = stableSamplesRef.current[0];
            for (const s of stableSamplesRef.current) {
              if (s.score > best.score) best = s;
            }
            stableSamplesRef.current = [];
            isScanningRef.current = false;

            await checkFaceExit(best.embedding);
          } catch (err) {
            const msg = String(err?.message || '');
            if (msg.includes('fenceSync') || msg.toLowerCase().includes('webgl')) {
              console.warn('[SalidaFacial] Contexto WebGL perdido, reiniciando motor en WASM...');
              stableSamplesRef.current = [];
              isReinitializingEngine = true;
              if (isMounted) {
                setScanStatus('Reiniciando motor gráfico...');
              }
              try {
                await setupEngine(true);
                if (isMounted) {
                  setScanStatus('Escaneando rostros para salida...');
                }
              } catch (reinitErr) {
                console.error('[SalidaFacial] Error al reiniciar motor:', reinitErr);
              } finally {
                isReinitializingEngine = false;
              }
              return;
            }

            console.error('[SalidaFacial] Error en detección de salida:', err);
            if (isMounted) {
              setScanStatus(`Error en detección: ${err?.message || 'revisa la consola'}`);
            }
          } finally {
            isDetectingRef.current = false;
          }
        }, 450);
      } catch (err) {
        console.error('[SalidaFacial] Error al iniciar cámara o IA:', err);
        if (isMounted) {
          setScanStatus(`Error: ${err?.message || 'No se pudo iniciar la cámara o la IA'}`);
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (interval) clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const checkFaceExit = async (faceEmbedding) => {
    setScanStatus('Verificando identidad e ingreso previo...');

    try {
      const res = await accessApi.identifyFace(faceEmbedding);
      const clientId = res?.client?.id;

      if (res && (res.success || res.status === 'IDENTIFIED') && clientId) {
        setIdentifiedClient(res.client);
        setErrorReason(null);
        await executeConfirmExit(clientId);
      } else {
        triggerErrorState(res?.error || 'Persona no identificada');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Persona no identificada';
      triggerErrorState(errMsg);
    }
  };

  const executeConfirmExit = async (userId) => {
    try {
      const res = await accessApi.confirmExit(userId);

      if (res && res.success) {
        const now = new Date();
        const horaSalida = now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        setExitResult({
          message: res.message || 'Salida registrada exitosamente',
          horaSalida,
          metodo: 'Reconocimiento Facial',
        });

        isScanningRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          resetScannerState();
        }, 25000);
      } else {
        triggerErrorState(res?.error || 'No se pudo registrar la salida');
      }
    } catch (err) {
      const serverMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'No existe un ingreso previo sin salida registrada hoy';
      triggerErrorState(serverMsg);
    }
  };

  const resetScannerState = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stableSamplesRef.current = [];
    setIdentifiedClient(null);
    setExitResult(null);
    setErrorReason(null);
    setScanStatus('Escaneando rostros para salida...');
    isScanningRef.current = true;
  };

  const triggerErrorState = (msg) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stableSamplesRef.current = [];
    setIdentifiedClient(null);
    setExitResult(null);
    setErrorReason(msg);
    setScanStatus('Salida no registrada');
    timerRef.current = setTimeout(() => {
      resetScannerState();
    }, 3500);
  };

  return (
    <DashboardLayout title="Registro de Salida Biométrico">
      <div className="access-terminal-container">
        <div className="terminal-main-card" style={{ padding: '2rem' }}>
          {!isReady && !errorReason && (
            <div style={{ height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader text="Iniciando cámara y optimizando modelos de IA..." />
            </div>
          )}

          <div
            className="scanner-viewport-box"
            style={{
              width: '100%',
              height: '400px',
              margin: '0 auto',
              maxWidth: '640px',
              display: (!isReady || exitResult) ? 'none' : 'block',
            }}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.72)',
                textAlign: 'center',
                padding: '10px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#fff',
              }}
            >
              {scanStatus}
            </div>
          </div>

          {errorReason && (
            <div
              style={{
                marginTop: '1.5rem',
                maxWidth: '640px',
                marginLeft: 'auto',
                marginRight: 'auto',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <XCircle size={40} color="#dc2626" style={{ margin: '0 auto 8px' }} />
              <h3 style={{ color: '#991b1b', fontWeight: '800', fontSize: '1.2rem', margin: '4px 0' }}>
                SALIDA NO REGISTRADA
              </h3>
              <p style={{ color: '#b91c1c', fontSize: '0.95rem', margin: 0 }}>
                {errorReason}
              </p>
            </div>
          )}

          {identifiedClient && exitResult && (
            <div className="access-success-card-bottom" style={{ maxWidth: '640px', margin: '1.5rem auto 0' }}>
              <div className="success-header-row">
                <div className="success-icon-badge">
                  <Check size={20} strokeWidth={3} />
                </div>
                <div className="success-title-group">
                  <h3>SALIDA REGISTRADA</h3>
                  <p>{exitResult.message}</p>
                </div>
              </div>

              <div className="success-details-grid">
                <div className="detail-item">
                  <span className="detail-label">CLIENTE</span>
                  <span className="detail-value">
                    {identifiedClient.firstName || identifiedClient.first_name}{' '}
                    {identifiedClient.lastName || identifiedClient.last_name}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">N° DOCUMENTO</span>
                  <span className="detail-value">
                    {identifiedClient.tipo_documento ? identifiedClient.tipo_documento.toUpperCase() : 'DOC'}:{' '}
                    {identifiedClient.numero_documento || identifiedClient.dni}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">HORA DE SALIDA</span>
                  <span className="detail-value">{exitResult.horaSalida}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">MÉTODO</span>
                  <span className="detail-value">{exitResult.metodo}</span>
                </div>
              </div>

              <div className="success-footer-action">
                <button type="button" onClick={resetScannerState} className="action-btn next-client-btn">
                  Siguiente Cliente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}