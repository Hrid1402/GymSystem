import Human from '@vladmandic/human';
import { useEffect, useRef, useState } from 'react';
import { accessApi } from '../../api/accessApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/acceso.css';

const humanConfig = {
  backend: 'cpu',
  modelBasePath: '/models',
  face: { enabled: true, detector: { rotation: true, maxFaces: 1 }, embedding: { enabled: true } },
  body: { enabled: false },
  hand: { enabled: false },
};
const human = new Human(humanConfig);

export default function AccessScanner() {
  const videoRef = useRef(null);
  const [scanStatus, setScanStatus] = useState('Escaneando rostros...');
  const [identifiedClient, setIdentifiedClient] = useState(null);
  const [membershipInfo, setMembershipInfo] = useState(null);
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [errorReason, setErrorReason] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    let stream = null;
    let interval = null;
    let isMounted = true;

    const initCamera = async () => {
      try {
        await human.load();
        if (!isMounted) return;

        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current.play();
            } catch (e) {
              console.warn("Play interrumpido evitado:", e);
            }
          };
        }

        // Intervalo de escaneo
        interval = setInterval(async () => {
          if (!isScanning || !videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

          const result = await human.detect(videoRef.current);
          
          if (result.face && result.face.length > 0) {
            console.log("¡Rostro detectado con éxito!", result.face[0]);
            const faceEmbedding = Array.from(result.face[0].embedding);
            await checkFaceAccess(faceEmbedding);
          }
        }, 1500);

      } catch (err) {
        console.error("Error al iniciar cámara o IA:", err);
        setScanStatus('Error al iniciar la cámara');
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isScanning]);

  const checkFaceAccess = async (faceEmbedding) => {
    setIsScanning(false);
    setScanStatus('Verificando en sistema...');

    try {
      const res = await accessApi.identifyFace(faceEmbedding);

      if (res && (res.success || res.status === 'IDENTIFIED')) {
        setIdentifiedClient(res.client);
        setMembershipInfo(res.membership);
        setErrorReason(null);
        setScanStatus('Cliente identificado');

        // Extraemos de manera segura los IDs reales devueltos por el backend
        const realUserId = res.client?.id;
        const realMembershipId = res.membership?.id;

        console.log("🔍 IDs reales listos para confirmar asistencia:", { realUserId, realMembershipId });

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
      if (!userId || !membershipId) {
        console.warn("Faltan datos críticos para registrar asistencia:", { userId, membershipId });
        triggerErrorState("El cliente no cuenta con una membresía válida asociada.");
        return;
      }

      // Petición al backend con los IDs reales
      const res = await accessApi.confirmAttendance(userId, membershipId);
      
      if (res && res.success) {
        const now = new Date();
        const horaFormateada = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        
        setAttendanceResult({
          isReentry: res.isReentry,
          message: res.message || 'Acceso concedido exitosamente',
          horaIngreso: horaFormateada,
          metodo: 'Reconocimiento Facial'
        });

        timerRef.current = setTimeout(() => {
          resetScannerState();
        }, 3000);
      } else {
        triggerErrorState(res?.error || 'No se pudo registrar la asistencia');
      }
    } catch (err) {
      console.error('Detalle del error del servidor al registrar asistencia:', err.response?.data || err.message);
      const serverMsg = err.response?.data?.error || err.response?.data?.message || 'Error al registrar asistencia en el servidor';
      triggerErrorState(serverMsg);
    }
  };

  const resetScannerState = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIdentifiedClient(null);
    setMembershipInfo(null);
    setAttendanceResult(null);
    setErrorReason(null);
    setIsScanning(true);
    setScanStatus('Escaneando rostros...');
  };

  const triggerErrorState = (msg) => {
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
          
          <div className="scanner-viewport-box" style={{ width: '100%', height: '400px', margin: '0 auto', maxWidth: '640px' }}>
            <video ref={videoRef} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 0, insetX: 0, background: 'rgba(0,0,0,0.7)', textAlign: 'center', padding: '10px', fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>
              {scanStatus}
            </div>
          </div>

          {errorReason && (
            <div style={{ marginTop: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>❌</span>
              <h3 style={{ color: '#991b1b', fontWeight: '800', fontSize: '1.2rem', margin: '4px 0' }}>ACCESO DENEGADO</h3>
              <p style={{ color: '#b91c1c', fontSize: '0.95rem', margin: 0 }}>{errorReason}</p>
            </div>
          )}

          {identifiedClient && membershipInfo && attendanceResult && (
            <div className="access-success-card-bottom">
              <div className="success-header-row">
                <div className="success-icon-badge">✓</div>
                <div className="success-title-group">
                  <h3>{attendanceResult.isReentry ? 'REINGRESO PERMITIDO' : 'INGRESO REGISTRADO'}</h3>
                  <p>{attendanceResult.message} (Redirigiendo en 3s...)</p>
                </div>
              </div>

              <div className="success-details-grid">
                <div className="detail-item">
                  <span className="detail-label">CLIENTE</span>
                  <span className="detail-value">{identifiedClient.firstName || identifiedClient.first_name} {identifiedClient.lastName || identifiedClient.last_name}</span>
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
                <button
                  type="button"
                  onClick={resetScannerState}
                  className="action-btn next-client-btn"
                >
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