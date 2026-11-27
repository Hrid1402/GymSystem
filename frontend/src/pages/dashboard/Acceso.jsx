import Human from '@vladmandic/human';
import { Check, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { accessApi } from '../../api/accessApi';
import Loader from '../../components/common/Loader';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/acceso.css';

const humanConfig = {
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
const human = new Human(humanConfig);

// En acceso priorizamos fluidez y tolerancia moderada frente a registro
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

function evaluateFaceForAccess(face, videoWidth, videoHeight) {
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

export default function AccessScanner() {
  const videoRef = useRef(null);
  const [scanStatus, setScanStatus] = useState('Cargando cámara e IA...');
  const [identifiedClient, setIdentifiedClient] = useState(null);
  const [membershipInfo, setMembershipInfo] = useState(null);
  const [attendanceResult, setAttendanceResult] = useState(null);
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

    isScanningRef.current = true;
    isDetectingRef.current = false;
    stableSamplesRef.current = [];

    const initCamera = async () => {
      try {
        setScanStatus('Cargando modelos de IA y optimizando GPU...');
        await human.load();
        if (!isMounted) return;
        await human.warmup();
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
            console.warn('[AccessScanner] Play inicial pendiente:', e);
          }
        }

        if (!isMounted) return;
        setIsReady(true);
        isScanningRef.current = true;
        setScanStatus('Escaneando rostros...');

        interval = setInterval(async () => {
          const el = videoRef.current;
          if (!isMounted || !isScanningRef.current || isDetectingRef.current || !el) {
            return;
          }

          if (el.paused || el.ended || el.readyState < 2) {
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
            const vw = el.videoWidth || 640;
            const vh = el.videoHeight || 480;
            const result = await human.detect(el);

            if (!isMounted || !isScanningRef.current) return;

            if (!result.face || result.face.length === 0) {
              stableSamplesRef.current = [];
              setScanStatus('Escaneando rostros...');
              return;
            }

            if (result.face.length > 1) {
              stableSamplesRef.current = [];
              setScanStatus('Solo debe haber una persona frente a la cámara.');
              return;
            }

            const check = evaluateFaceForAccess(result.face[0], vw, vh);
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

            await checkFaceAccess(best.embedding);
          } catch (err) {
            console.error('[AccessScanner] Error en detección de acceso:', err);
            if (isMounted) {
              setScanStatus(`Error en detección: ${err?.message || 'revisa la consola'}`);
            }
          } finally {
            isDetectingRef.current = false;
          }
        }, 450);
      } catch (err) {
        console.error('[AccessScanner] Error al iniciar cámara o IA:', err);
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

  const checkFaceAccess = async (faceEmbedding) => {
    setScanStatus('Verificando identidad y membresía...');

    try {
      const res = await accessApi.identifyFace(faceEmbedding);

      if (res && (res.success || res.status === 'IDENTIFIED')) {
        const realUserId = res.client?.id;
        const realMembershipId = res.membership?.id;

        if (!realUserId || !realMembershipId) {
          triggerErrorState('El cliente no cuenta con una membresía válida asociada.');
          return;
        }

        setIdentifiedClient(res.client);
        setMembershipInfo(res.membership);
        setErrorReason(null);
        setScanStatus('Cliente identificado');

        await executeConfirmAttendance(realUserId, realMembershipId);
      } else {
        triggerErrorState(res?.error || 'Persona no identificada');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Persona no identificada o sin membresía';
      triggerErrorState(errMsg);
    }
  };

  const executeConfirmAttendance = async (userId, membershipId) => {
    try {
      const res = await accessApi.confirmAttendance(userId, membershipId);

      if (res && res.success) {
        const now = new Date();
        const horaFormateada = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

        setAttendanceResult({
          isReentry: res.isReentry,
          message: res.message || 'Acceso concedido exitosamente',
          horaIngreso: horaFormateada,
          metodo: 'Reconocimiento Facial',
        });

        isScanningRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          resetScannerState();
        }, 25000);
      } else {
        const isAlreadyInside =
          res?.code === 'ALREADY_INSIDE' ||
          String(res?.error || res?.message || '').toLowerCase().includes('ingreso activo sin salida');
        triggerErrorState(
          isAlreadyInside
            ? 'El cliente cuenta con un ingreso activo sin salida'
            : (res?.error || 'No se pudo registrar la asistencia')
        );
      }
    } catch (err) {
      const payload = err?.response?.data || err?.data || {};
      const rawMsg = payload?.error || payload?.message || err?.message || '';
      console.error('Detalle del error del servidor al registrar asistencia:', payload || rawMsg);

      const isAlreadyInside =
        payload?.code === 'ALREADY_INSIDE' ||
        String(rawMsg).toLowerCase().includes('ingreso activo sin salida');

      const finalMsg = isAlreadyInside
        ? 'El cliente cuenta con un ingreso activo sin salida'
        : (payload?.error || payload?.message || 'Error al registrar asistencia en el servidor');

      triggerErrorState(finalMsg);
    }
  };

  const resetScannerState = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stableSamplesRef.current = [];
    setIdentifiedClient(null);
    setMembershipInfo(null);
    setAttendanceResult(null);
    setErrorReason(null);
    setScanStatus('Escaneando rostros...');
    isScanningRef.current = true;
  };

  const triggerErrorState = (msg) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stableSamplesRef.current = [];
    setIdentifiedClient(null);
    setMembershipInfo(null);
    setAttendanceResult(null);
    setErrorReason(msg);
    setScanStatus('Acceso Denegado');
    timerRef.current = setTimeout(() => {
      resetScannerState();
    }, 3500);
  };

  return (
    <DashboardLayout title="Control de Acceso Biométrico">
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
              display: (!isReady || attendanceResult) ? 'none' : 'block',
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
            <div style={{ marginTop: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <XCircle size={40} color="#dc2626" style={{ margin: '0 auto 8px' }} />
              <h3 style={{ color: '#991b1b', fontWeight: '800', fontSize: '1.2rem', margin: '4px 0' }}>ACCESO DENEGADO</h3>
              <p style={{ color: '#b91c1c', fontSize: '0.95rem', margin: 0 }}>{errorReason}</p>
            </div>
          )}

          {identifiedClient && membershipInfo && attendanceResult && (
            <div className="access-success-card-bottom" style={{ maxWidth: '640px', margin: '0 auto' }}>
              <div className="success-header-row">
                <div className="success-icon-badge"><Check size={20} strokeWidth={3} /></div>
                <div className="success-title-group">
                  <h3>{attendanceResult.isReentry ? 'REINGRESO PERMITIDO' : 'INGRESO REGISTRADO'}</h3>
                  <p>{attendanceResult.message}</p>
                </div>
              </div>

              <div className="success-details-grid">
                <div className="detail-item">
                  <span className="detail-label">CLIENTE</span>
                  <span className="detail-value">
                    {identifiedClient.firstName || identifiedClient.first_name} {identifiedClient.lastName || identifiedClient.last_name}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">N° DOCUMENTO</span>
                  <span className="detail-value">
                    {identifiedClient.tipo_documento ? identifiedClient.tipo_documento.toUpperCase() : 'DOC'}: {identifiedClient.numero_documento || identifiedClient.dni}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">PLAN</span>
                  <span className="detail-value">{membershipInfo.planName || membershipInfo.plan_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">VENCE</span>
                  <span className="detail-value">{membershipInfo.endDate || membershipInfo.end_date}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">HORA DE INGRESO</span>
                  <span className="detail-value">{attendanceResult.horaIngreso}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">MÉTODO</span>
                  <span className="detail-value">{attendanceResult.metodo}</span>
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