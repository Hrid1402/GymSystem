// src/components/FaceRegistration.jsx
import Human from '@vladmandic/human';
import { useEffect, useRef, useState } from 'react';

const humanConfig = {
    backend: 'webgl',
    modelBasePath: '/models', // Ubicación de los modelos en public/models
    face: {
        enabled: true,
        detector: { rotation: true, maxFaces: 1 },
        embedding: { enabled: true }, // Obligatorio para extraer el descriptor facial
    },
    body: { enabled: false },
    hand: { enabled: false },
};

const human = new Human(humanConfig);

export default function FaceRegistration({ clientId, onRegistered }) {
    const videoRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Cargando modelos de IA...');

    useEffect(() => {
        let stream = null;
        const init = async () => {
        try {
            await human.load();
            await human.warmup();
            setStatus('Modelos listos. Iniciando cámara...');
            
            stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            }
            setLoading(false);
            setStatus('Coloque al cliente frente a la cámara.');
        } catch (err) {
            setStatus('Error al iniciar la cámara o los modelos.');
            console.error(err);
        }
        };
        init();

        return () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, []);

    const captureAndRegister = async () => {
        if (!videoRef.current) return;
        setStatus('Procesando rostro...');

        // Detectar rostro y extraer embedding
        const result = await human.detect(videoRef.current);

        if (!result.face || result.face.length === 0) {
        setStatus('No se detectó ningún rostro. Intente de nuevo.');
        return;
        }

        // Obtenemos el embedding (descriptor facial de 512 valores)
        const embedding = Array.from(result.face[0].embedding);

        try {
        // Enviar al Backend (Flujo A - Paso 6)
        const response = await fetch('/api/clients/register-face', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, embedding }),
        });

        const data = await response.json();
        if (response.ok) {
            setStatus('¡Registro facial completado con éxito!');
            if (onRegistered) onRegistered(data);
        } else {
            setStatus(`Error: ${data.message}`);
        }
        } catch (err) {
        setStatus('Error de red al guardar el registro.');
        }
    };

    return (
        <div className="flex flex-col items-center p-4">
        <h2 className="text-xl font-bold mb-2">Registro Biométrico - Recepción</h2>
        <p className="text-sm text-gray-600 mb-4">{status}</p>
        <div className="relative border-4 border-gray-300 rounded-lg overflow-hidden">
            <video ref={videoRef} muted className="w-[640px] h-[480px] object-cover" />
        </div>
        <button
            onClick={captureAndRegister}
            disabled={loading}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
            Capturar y Registrar Rostro
        </button>
        </div>
    );
}