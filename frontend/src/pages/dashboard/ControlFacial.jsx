import Human from '@vladmandic/human';
import { useEffect, useRef, useState } from 'react';
import { accessApi } from '../../api/accessApi';
import { apiClient } from '../../api/client';
import Loader from '../../components/common/Loader';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/controlFacial.css';

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

const REQUIRED_STABLE_FRAMES = 3;
const MIN_FACE_SCORE = 0.65;
// Proporción del ancho/alto del rostro respecto al frame (640x480)
const MIN_WIDTH_RATIO = 0.24;
const MAX_WIDTH_RATIO = 0.68;
const MIN_HEIGHT_RATIO = 0.28;
const MAX_HEIGHT_RATIO = 0.78;
// Tolerancia de inclinación/giro en radianes o grados según lo que devuelva Human
const MAX_ANGLE_RAD = 0.35; // ~20 grados si viene en radianes

function normalizeAngles(face) {
    const raw = face?.rotation?.angle || face?.angle || {};
    const yaw = typeof raw.yaw === 'number' ? raw.yaw : 0;
    const pitch = typeof raw.pitch === 'number' ? raw.pitch : 0;
    const roll = typeof raw.roll === 'number' ? raw.roll : 0;
    // Si los valores superan ~3.5, probablemente vienen en grados en vez de radianes
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

function evaluateFaceFrame(face, videoWidth, videoHeight) {
    if (!face || !Array.isArray(face.embedding) && !(face.embedding instanceof Float32Array)) {
        return { ok: false, reason: 'No se pudo extraer el vector facial. Mantén el rostro visible.' };
    }

    const score = typeof face.score === 'number' ? face.score : 1;
    if (score < MIN_FACE_SCORE) {
        return { ok: false, reason: 'Baja confianza en la detección. Mejora la iluminación y mira al frente.' };
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

    if (!box || !videoWidth || !videoHeight) {
        return { ok: false, reason: 'Calculando posición del rostro...' };
    }

    const [bx, by, bw, bh] = box;
    const widthRatio = bw / videoWidth;
    const heightRatio = bh / videoHeight;
    const centerX = (bx + bw / 2) / videoWidth;
    const centerY = (by + bh / 2) / videoHeight;

    if (widthRatio < MIN_WIDTH_RATIO || heightRatio < MIN_HEIGHT_RATIO) {
        return { ok: false, reason: 'Acércate un poco más a la cámara.' };
    }
    if (widthRatio > MAX_WIDTH_RATIO || heightRatio > MAX_HEIGHT_RATIO) {
        return { ok: false, reason: 'Aléjate un poco de la cámara para encuadrar todo el rostro.' };
    }
    if (centerX < 0.28 || centerX > 0.72 || centerY < 0.22 || centerY > 0.78) {
        return { ok: false, reason: 'Centra tu rostro dentro del recuadro.' };
    }

    const { yaw, pitch, roll } = normalizeAngles(face);
    if (Math.abs(yaw) > MAX_ANGLE_RAD || Math.abs(pitch) > MAX_ANGLE_RAD || Math.abs(roll) > MAX_ANGLE_RAD) {
        return { ok: false, reason: 'Mira directamente al frente sin girar ni inclinar la cabeza.' };
    }

    return {
        ok: true,
        centerX,
        centerY,
        widthRatio,
        score,
        embedding: Array.from(face.embedding),
    };
}

export default function ControlFacial() {
    const [activeTab, setActiveTab] = useState('pending');
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isCaptureReady, setIsCaptureReady] = useState(false);
    const [scanStatus, setScanStatus] = useState('Escaneando rostros...');
    const [successData, setSuccessData] = useState(null);
    const [errorReason, setErrorReason] = useState(null);

    const videoRef = useRef(null);
    const intervalRef = useRef(null);
    const streamRef = useRef(null);
    const isScanningRef = useRef(false);
    const isDetectingFrameRef = useRef(false);
    const stableSamplesRef = useRef([]);

    // Pre-cargar y pre-calentar modelos de IA en GPU al montar la vista
    useEffect(() => {
        human.load().then(() => human.warmup()).catch((e) => console.warn('[ControlFacial] Pre-warmup:', e));
    }, []);

    useEffect(() => {
        stopCameraAndScanner();
        setIsCapturing(false);
        setIsCaptureReady(false);
        setSelectedClient(null);
        setSuccessData(null);
        setErrorReason(null);
        fetchClients();

        return () => {
            stopCameraAndScanner();
        };
    }, [activeTab]);

    const stopCameraAndScanner = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        isScanningRef.current = false;
        isDetectingFrameRef.current = false;
        stableSamplesRef.current = [];
    };

    const fetchClients = async () => {
        try {
            let res;
            if (activeTab === 'pending') {
                res = await apiClient.get('/users/pending-face');
            } else {
                res = await apiClient.get('/users/registered-face');
            }

            let clientsArray = [];
            if (Array.isArray(res)) {
                clientsArray = res;
            } else if (res && Array.isArray(res.users)) {
                clientsArray = res.users;
            } else if (res && Array.isArray(res.data)) {
                clientsArray = res.data;
            } else if (res && Array.isArray(res.clients)) {
                clientsArray = res.clients;
            }

            setClients(clientsArray);
        } catch (err) {
            console.error('Error al cargar clientes:', err);
            setClients([]);
        }
    };

    const formatDocumentDisplay = (tipo, numero) => {
        if (!tipo) return numero || 'N/A';
        const cleanTipo = tipo.toLowerCase().trim();
        let label = 'DOC';

        if (cleanTipo === 'dni') label = 'DNI';
        else if (cleanTipo === 'carnet_extranjeria' || cleanTipo === 'ce') label = 'C.E.';
        else if (cleanTipo === 'pasaporte') label = 'Pasaporte';
        else label = tipo.toUpperCase();

        return (
            <span>
                <strong>{label}</strong>: {numero || ''}
            </span>
        );
    };

    const pickBestEmbedding = (samples) => {
        if (!samples.length) return null;
        let best = samples[0];
        for (const s of samples) {
            if (s.score > best.score) best = s;
        }
        return best.embedding;
    };

    const startScanLoop = (client) => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        stableSamplesRef.current = [];
        isScanningRef.current = true;
        isDetectingFrameRef.current = false;

        intervalRef.current = setInterval(async () => {
            if (
                !isScanningRef.current ||
                isDetectingFrameRef.current ||
                !videoRef.current ||
                videoRef.current.paused ||
                videoRef.current.ended ||
                videoRef.current.readyState < 2
            ) {
                return;
            }

            isDetectingFrameRef.current = true;
            try {
                const videoEl = videoRef.current;
                const vw = videoEl.videoWidth || 640;
                const vh = videoEl.videoHeight || 480;
                const result = await human.detect(videoEl);

                if (!isScanningRef.current) return;

                if (!result.face || result.face.length === 0) {
                    stableSamplesRef.current = [];
                    setScanStatus('No se detecta rostro. Ubícate frente a la cámara.');
                    return;
                }

                if (result.face.length > 1) {
                    stableSamplesRef.current = [];
                    setScanStatus('Se detectó más de un rostro. Solo debe haber una persona frente a la cámara.');
                    return;
                }

                const check = evaluateFaceFrame(result.face[0], vw, vh);
                if (!check.ok) {
                    stableSamplesRef.current = [];
                    setScanStatus(check.reason);
                    return;
                }

                const prev = stableSamplesRef.current[stableSamplesRef.current.length - 1];
                if (prev) {
                    const dx = Math.abs(check.centerX - prev.centerX);
                    const dy = Math.abs(check.centerY - prev.centerY);
                    const dw = Math.abs(check.widthRatio - prev.widthRatio);
                    if (dx > 0.08 || dy > 0.08 || dw > 0.08) {
                        stableSamplesRef.current = [check];
                        setScanStatus(`Mantén el rostro quieto... (1/${REQUIRED_STABLE_FRAMES})`);
                        return;
                    }
                }

                stableSamplesRef.current.push(check);
                const count = stableSamplesRef.current.length;

                if (count < REQUIRED_STABLE_FRAMES) {
                    setScanStatus(`Rostro encuadrado. Mantén la postura... (${count}/${REQUIRED_STABLE_FRAMES})`);
                } else {
                    const finalEmbedding = pickBestEmbedding(stableSamplesRef.current);
                    isScanningRef.current = false;
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                    stableSamplesRef.current = [];
                    await processAndSaveFace(client, finalEmbedding);
                }
            } catch (err) {
                console.error('Error durante detección facial:', err);
            } finally {
                isDetectingFrameRef.current = false;
            }
        }, 450);
    };

    const startCapture = async (client) => {
        stopCameraAndScanner();
        setSelectedClient(client);
        setIsCapturing(true);
        setIsCaptureReady(false);
        setSuccessData(null);
        setErrorReason(null);
        setScanStatus('Cargando modelos de IA y optimizando GPU...');
        isScanningRef.current = true;

        try {
            await human.load();
            await human.warmup();
            streamRef.current = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            });

            if (videoRef.current) {
                videoRef.current.srcObject = streamRef.current;
                videoRef.current.onloadedmetadata = async () => {
                    try {
                        await videoRef.current.play();
                    } catch (e) {
                        console.warn('Play interrumpido evitado:', e);
                    }
                    setIsCaptureReady(true);
                    setScanStatus('Alinea tu rostro al frente a una distancia media...');
                    startScanLoop(client);
                };
            }
        } catch (err) {
            console.error('Error al iniciar cámara o IA:', err);
            setScanStatus('Error al iniciar la cámara');
            isScanningRef.current = false;
        }
    };

    const processAndSaveFace = async (client, embedding) => {
        if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
            triggerErrorState('No se obtuvo un vector facial válido.');
            return;
        }

        setScanStatus('Guardando en sistema...');

        try {
            const res = await accessApi.registerFace(client.id, embedding);

            if (res && (res.success || res.ok)) {
                // Detener inmediatamente la cámara y apagar el stream físico
                stopCameraAndScanner();

                setScanStatus('¡Operación realizada con éxito!');

                const now = new Date();
                const horaFormateada = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const docFormatted = formatDocumentDisplay(client.tipo_documento, client.numero_documento || client.dni);

                setSuccessData({
                    fullName: `${client.first_name || client.firstName} ${client.last_name || client.lastName}`,
                    documento: docFormatted,
                    actionType: activeTab === 'pending' ? 'Registro Facial Inicial' : 'Actualización de Rostro',
                    hora: horaFormateada,
                    metodo: 'Reconocimiento Facial',
                });
            } else {
                const msg = res?.message || res?.error || 'No se pudo guardar el registro facial';
                triggerErrorState(msg);
            }
        } catch (err) {
            console.error('Error al guardar el rostro:', err);
            const serverMsg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                'Error al procesar el rostro en el servidor';
            triggerErrorState(serverMsg);
        }
    };

    const triggerErrorState = (msg) => {
        setScanStatus('Error en el registro');
        setErrorReason(msg);
    };

    const retryScanning = () => {
        if (!selectedClient || !videoRef.current) return;
        setErrorReason(null);
        setScanStatus('Alinea tu rostro al frente a una distancia media...');
        startScanLoop(selectedClient);
    };

    const returnToTable = () => {
        stopCameraAndScanner();
        setSelectedClient(null);
        setSuccessData(null);
        setErrorReason(null);
        setScanStatus('Escaneando rostros...');
        setIsCapturing(false);
        setIsCaptureReady(false);
        fetchClients();
    };

    return (
        <DashboardLayout title="Gestión de Reconocimiento Facial">
            <div className="facial-container">
                <div className="facial-tabs-header">
                    <button
                        type="button"
                        onClick={() => setActiveTab('pending')}
                        className={`facial-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                    >
                        Pendientes de Registro Facial
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('update')}
                        className={`facial-tab-btn ${activeTab === 'update' ? 'active' : ''}`}
                    >
                        Actualizar Rostro de Clientes
                    </button>
                </div>

                {!isCapturing ? (
                    <div className="facial-table-card">
                        <div className="table-responsive">
                            <table className="facial-table">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>N° Documento</th>
                                        <th>Teléfono</th>
                                        <th className="text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="empty-message">
                                                {activeTab === 'pending'
                                                    ? 'No hay clientes pendientes de registro facial.'
                                                    : 'No hay clientes con reconocimiento facial registrado para actualizar.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        clients.map((client) => {
                                            const documentoNode = formatDocumentDisplay(
                                                client.tipo_documento,
                                                client.numero_documento || client.dni
                                            );
                                            return (
                                                <tr key={client.id}>
                                                    <td className="client-name">
                                                        {client.first_name} {client.last_name}
                                                    </td>
                                                    <td>{documentoNode}</td>
                                                    <td>{client.phone || 'N/A'}</td>
                                                    <td className="text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => startCapture(client)}
                                                            className="action-btn"
                                                        >
                                                            {activeTab === 'pending' ? 'Registrar Rostro' : 'Actualizar Rostro'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="capture-box">
                        <h2 className="capture-title">
                            {successData
                                ? (activeTab === 'pending' ? 'Registro completado para:' : 'Rostro actualizado para:')
                                : (activeTab === 'pending' ? 'Registrando a:' : 'Actualizando rostro de:')}{' '}
                            {selectedClient?.first_name} {selectedClient?.last_name}
                        </h2>

                        {!isCaptureReady && !successData && !errorReason && (
                            <div style={{ height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Loader text="Iniciando cámara y optimizando modelos de IA..." />
                            </div>
                        )}

                        {!successData && (
                            <div
                                className="scanner-viewport-box"
                                style={{
                                    width: '100%',
                                    height: '400px',
                                    margin: '0 auto',
                                    maxWidth: '640px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    borderRadius: '8px',
                                    display: isCaptureReady ? 'block' : 'none',
                                }}
                            >
                                <video
                                    ref={videoRef}
                                    muted
                                    playsInline
                                    className="capture-video"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div className="face-guide-oval" aria-hidden="true" />
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        background: 'rgba(0,0,0,0.75)',
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
                        )}

                        {errorReason && (
                            <div
                                style={{
                                    marginTop: '1.5rem',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '12px',
                                    padding: '1.5rem',
                                    textAlign: 'center',
                                    maxWidth: '640px',
                                    marginInline: 'auto',
                                }}
                            >
                                <span style={{ fontSize: '2.5rem' }}>❌</span>
                                <h3 style={{ color: '#991b1b', fontWeight: '800', fontSize: '1.2rem', margin: '4px 0' }}>
                                    ERROR DE REGISTRO
                                </h3>
                                <p style={{ color: '#b91c1c', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>{errorReason}</p>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={retryScanning}
                                        className="action-btn"
                                        style={{
                                            background: '#dc2626',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                        }}
                                    >
                                        Intentar Nuevamente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={returnToTable}
                                        className="action-btn cancel-btn"
                                        style={{
                                            background: '#4b5563',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                        }}
                                    >
                                        Volver
                                    </button>
                                </div>
                            </div>
                        )}

                        {!successData && !errorReason && (
                            <div className="capture-actions" style={{ marginTop: '1rem', textAlign: 'center' }}>
                                <button type="button" onClick={returnToTable} className="action-btn cancel-btn">
                                    Cancelar
                                </button>
                            </div>
                        )}

                        {successData && (
                            <div className="access-success-card-bottom" style={{ marginTop: '1.5rem' }}>
                                <div className="success-header-row">
                                    <div className="success-icon-badge">✓</div>
                                    <div className="success-title-group">
                                        <h3>{activeTab === 'pending' ? 'REGISTRO EXITOSO' : 'ACTUALIZACIÓN EXITOSA'}</h3>
                                        <p>Los datos biométricos se guardaron correctamente en el sistema.</p>
                                    </div>
                                </div>

                                <div className="success-details-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">CLIENTE</span>
                                        <span className="detail-value">{successData.fullName}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">DOCUMENTO</span>
                                        <span className="detail-value">{successData.documento}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">ACCIÓN</span>
                                        <span className="detail-value">{successData.actionType}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">ESTADO</span>
                                        <span className="detail-value">Completado</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">HORA</span>
                                        <span className="detail-value">{successData.hora}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">MÉTODO</span>
                                        <span className="detail-value">{successData.metodo}</span>
                                    </div>
                                </div>

                                <div className="success-footer-action" style={{ marginTop: '1rem' }}>
                                    <button type="button" onClick={returnToTable} className="action-btn next-client-btn">
                                        {activeTab === 'pending' ? 'Siguiente Cliente' : 'Volver a la lista'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}