import Human from '@vladmandic/human';
import { useEffect, useRef, useState } from 'react';
import { accessApi } from '../../api/accessApi';
import { apiClient } from '../../api/client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/controlFacial.css';

const humanConfig = {
    backend: 'cpu',
    modelBasePath: '/models',
    face: { enabled: true, detector: { rotation: true, maxFaces: 1 }, embedding: { enabled: true } },
    body: { enabled: false },
    hand: { enabled: false },
};
const human = new Human(humanConfig);

export default function ControlFacial() {
    const [activeTab, setActiveTab] = useState('pending');
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [scanStatus, setScanStatus] = useState('Escaneando rostros...');
    const [successData, setSuccessData] = useState(null);
    const [errorReason, setErrorReason] = useState(null); // <-- Estado para el error visual inferior
    
    const videoRef = useRef(null);
    const intervalRef = useRef(null);
    const streamRef = useRef(null);
    const isScanningRef = useRef(false);

    useEffect(() => {
        stopCameraAndScanner();
        setIsCapturing(false);
        setSelectedClient(null);
        setSuccessData(null);
        setErrorReason(null);
        fetchClients();
    }, [activeTab]);

    const stopCameraAndScanner = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        isScanningRef.current = false;
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

    const startCapture = async (client) => {
        setSelectedClient(client);
        setIsCapturing(true);
        setSuccessData(null);
        setErrorReason(null);
        setScanStatus('Cargando modelos de IA...');
        isScanningRef.current = true;

        try {
            await human.load();
            streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            
            if (videoRef.current) {
                videoRef.current.srcObject = streamRef.current;
                videoRef.current.onloadedmetadata = async () => {
                    try {
                        await videoRef.current.play();
                    } catch (e) {
                        console.warn("Play interrumpido evitado:", e);
                    }
                };
            }

            setScanStatus('Escaneando rostros...');

            intervalRef.current = setInterval(async () => {
                if (!isScanningRef.current || !videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

                const result = await human.detect(videoRef.current);
                
                if (result.face && result.face.length > 0) {
                    console.log("¡Rostro detectado con éxito!", result.face[0]);
                    const faceEmbedding = Array.from(result.face[0].embedding);
                    
                    isScanningRef.current = false;
                    clearInterval(intervalRef.current);

                    await processAndSaveFace(client, faceEmbedding);
                }
            }, 1500);

        } catch (err) {
            console.error("Error al iniciar cámara o IA:", err);
            setScanStatus('Error al iniciar la cámara');
            isScanningRef.current = false;
        }
    };

    const processAndSaveFace = async (client, embedding) => {
        setScanStatus('Guardando en sistema...');

        try {
            const res = await accessApi.registerFace(client.id, embedding);

            if (res && (res.success || res.ok)) {
                setScanStatus('¡Operación realizada con éxito!');
                
                const now = new Date();
                const horaFormateada = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                setSuccessData({
                    fullName: `${client.first_name || client.firstName} ${client.last_name || client.lastName}`,
                    dni: client.dni || 'N/A',
                    actionType: activeTab === 'pending' ? 'Registro Facial Inicial' : 'Actualización de Rostro',
                    hora: horaFormateada,
                    metodo: 'Reconocimiento Facial'
                });
            } else {
                const msg = res?.message || res?.error || 'No se pudo guardar el registro facial';
                triggerErrorState(msg);
            }
        } catch (err) {
            console.error('Error al guardar el rostro:', err);
            const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al procesar el rostro en el servidor';
            triggerErrorState(serverMsg);
        }
    };

    const triggerErrorState = (msg) => {
        setScanStatus('Error en el registro');
        setErrorReason(msg);
    };

    const retryScanning = () => {
        setErrorReason(null);
        setScanStatus('Escaneando rostros...');
        isScanningRef.current = true;

        // Reiniciamos el intervalo de escaneo
        intervalRef.current = setInterval(async () => {
            if (!isScanningRef.current || !videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

            const result = await human.detect(videoRef.current);
            
            if (result.face && result.face.length > 0) {
                const faceEmbedding = Array.from(result.face[0].embedding);
                isScanningRef.current = false;
                clearInterval(intervalRef.current);
                await processAndSaveFace(selectedClient, faceEmbedding);
            }
        }, 1500);
    };

    const returnToTable = () => {
        stopCameraAndScanner();
        setSelectedClient(null);
        setSuccessData(null);
        setErrorReason(null);
        setScanStatus('Escaneando rostros...');
        setIsCapturing(false);
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
                                    <th>DNI</th>
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
                                    clients.map(client => (
                                        <tr key={client.id}>
                                            <td className="client-name">{client.first_name} {client.last_name}</td>
                                            <td>{client.dni}</td>
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="capture-box">
                    <h2 className="capture-title">
                        {activeTab === 'pending' ? 'Registrando a:' : 'Actualizando rostro de:'} {selectedClient?.first_name} {selectedClient?.last_name}
                    </h2>
                    
                    <div className="scanner-viewport-box" style={{ width: '100%', height: '400px', margin: '0 auto', maxWidth: '640px', position: 'relative' }}>
                        <video
                            ref={videoRef}
                            muted
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', bottom: 0, insetX: 0, background: 'rgba(0,0,0,0.7)', textAlign: 'center', padding: '10px', fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>
                            {scanStatus}
                        </div>
                    </div>

                    {/* TARJETA DE ERROR ROJA INFERIOR (ESTILO ACCESO DENEGADO) */}
                    {errorReason && (
                        <div style={{ marginTop: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', maxWidth: '640px', marginInline: 'auto' }}>
                            <span style={{ fontSize: '2.5rem' }}>❌</span>
                            <h3 style={{ color: '#991b1b', fontWeight: '800', fontSize: '1.2rem', margin: '4px 0' }}>ERROR DE REGISTRO</h3>
                            <p style={{ color: '#b91c1c', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>{errorReason}</p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button
                                    type="button"
                                    onClick={retryScanning}
                                    className="action-btn"
                                    style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                                >
                                    Intentar Nuevamente
                                </button>
                                <button
                                    type="button"
                                    onClick={returnToTable}
                                    className="action-btn cancel-btn"
                                    style={{ background: '#4b5563', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                                >
                                    Volver
                                </button>
                            </div>
                        </div>
                    )}

                    {!successData && !errorReason && (
                        <div className="capture-actions" style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={returnToTable}
                                className="action-btn cancel-btn"
                            >
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
                                    <span className="detail-label">DNI</span>
                                    <span className="detail-value">{successData.dni}</span>
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
                                <button
                                    type="button"
                                    onClick={returnToTable}
                                    className="action-btn next-client-btn"
                                >
                                    Continuar
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