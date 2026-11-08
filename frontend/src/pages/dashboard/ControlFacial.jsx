import Human from '@vladmandic/human';
import { useEffect, useRef, useState } from 'react';
import { accessApi } from '../../api/accessApi';
import { apiClient } from '../../api/client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/controlFacial.css';

const humanConfig = {
  backend: 'cpu',
  modelBasePath: '/models',
  debug: false,
  face: { 
    enabled: true, 
    detector: { rotation: true, maxFaces: 1 }, 
    embedding: { enabled: true } 
  },
  body: { enabled: false },
  hand: { enabled: false },
  filter: { enabled: false },
};
const human = new Human(humanConfig);

export default function ControlFacial() {
  const [activeTab, setActiveTab] = useState('pending');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [successData, setSuccessData] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    stopCamera();
    setIsCapturing(false);
    setSelectedClient(null);
    setSuccessData(null);
    fetchClients();
  }, [activeTab]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const fetchClients = async () => {
    try {
      let res;
      if (activeTab === 'pending') {
        res = await apiClient.get('/users/pending-face');
      } else {
        // Pestaña 'update': Llama directamente al endpoint de clientes con rostro registrado
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
    setStatusMsg('Cargando modelos de IA...');

    try {
      await human.load();
      setStatusMsg('Solicitando acceso a la cámara...');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatusMsg('Coloque al cliente frente a la cámara');
    } catch (err) {
      console.error('Error de cámara o permisos:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatusMsg('Acceso denegado a la cámara. Autorice el uso en su navegador.');
      } else {
        setStatusMsg(`Error al iniciar la cámara: ${err.message || err.name}`);
      }
    }
  };

  const returnToTable = () => {
    stopCamera();
    setIsCapturing(false);
    setSelectedClient(null);
    setSuccessData(null);
    fetchClients();
  };

  const captureAndSave = async () => {
    if (!videoRef.current || !isCapturing) {
      console.warn('La captura fue cancelada o el elemento de video ya no está disponible.');
      return;
    }

    if (videoRef.current.readyState !== 4) {
      setStatusMsg('La cámara aún está iniciando. Espere un segundo e intente de nuevo.');
      return;
    }

    setStatusMsg('Procesando rostro...');

    try {
      const videoElement = videoRef.current;
      if (!videoElement || videoElement.paused || videoElement.ended) {
        setStatusMsg('El flujo de video se detuvo. Intente nuevamente.');
        return;
      }

      const result = await human.detect(videoElement);
      
      if (!isCapturing) return;

      if (!result || !result.face || result.face.length === 0) {
        setStatusMsg('No se detectó ningún rostro. Centre su rostro frente a la cámara.');
        return;
      }

      const embedding = Array.from(result.face[0].embedding);

      setStatusMsg('Guardando registro biométrico...');
      const res = await accessApi.registerFace(selectedClient.id, embedding);
      
      if (res && (res.success || res.ok)) {
        setStatusMsg('¡Operación realizada con éxito!');
        
        const now = new Date();
        const horaFormateada = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setSuccessData({
          fullName: `${selectedClient.first_name} ${selectedClient.last_name}`,
          dni: selectedClient.dni || 'N/A',
          actionType: activeTab === 'pending' ? 'Registro Facial Inicial' : 'Actualización de Rostro',
          hora: horaFormateada,
          metodo: 'Reconocimiento Facial'
        });

      } else {
        setStatusMsg(`Error: ${res?.message || 'No se pudo guardar en el servidor'}`);
      }
    } catch (err) {
      if (!isCapturing) return;
      console.error('Error al procesar el rostro:', err);
      setStatusMsg(`Error al procesar: ${err.message || 'Intente nuevamente'}`);
    }
  };

  const handleCancel = () => {
    returnToTable();
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
            <p className="capture-status">{statusMsg}</p>
            
            <div className="video-wrapper">
              <video 
                ref={videoRef} 
                muted 
                playsInline 
                className="capture-video"
              />
            </div>

            {!successData && (
              <div className="capture-actions">
                <button 
                  type="button" 
                  onClick={captureAndSave} 
                  className="action-btn save-btn"
                >
                  Capturar y Guardar
                </button>
                <button 
                  type="button" 
                  onClick={handleCancel} 
                  className="action-btn cancel-btn"
                >
                  Cancelar
                </button>
              </div>
            )}

            {successData && (
              <div className="access-success-card-bottom">
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

                <div className="success-footer-action">
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