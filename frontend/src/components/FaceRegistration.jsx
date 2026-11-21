import Human from '@vladmandic/human';
import { useEffect, useRef, useState } from 'react';

const humanConfig = {
    backend: 'cpu',
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

const MIN_FACE_SCORE = 0.65;
const MIN_WIDTH_RATIO = 0.24;
const MAX_WIDTH_RATIO = 0.68;
const MIN_HEIGHT_RATIO = 0.28;
const MAX_HEIGHT_RATIO = 0.78;
const MAX_ANGLE_RAD = 0.35;

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

function validateFaceCapture(face, videoWidth, videoHeight) {
    if (!face || (!Array.isArray(face.embedding) && !(face.embedding instanceof Float32Array))) {
        return { ok: false, message: 'No se pudo extraer el descriptor facial. Intente de nuevo.' };
    }

    const score = typeof face.score === 'number' ? face.score : 1;
    if (score < MIN_FACE_SCORE) {
        return { ok: false, message: 'Baja confianza en la detección. Mejore la iluminación y mire al frente.' };
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
            return { ok: false, message: 'Acérquese un poco más a la cámara.' };
        }
        if (widthRatio > MAX_WIDTH_RATIO || heightRatio > MAX_HEIGHT_RATIO) {
            return { ok: false, message: 'Aléjese un poco de la cámara para encuadrar todo el rostro.' };
        }
        if (centerX < 0.28 || centerX > 0.72 || centerY < 0.22 || centerY > 0.78) {
            return { ok: false, message: 'Centre el rostro dentro del recuadro.' };
        }
    }

    const { yaw, pitch, roll } = normalizeAngles(face);
    if (Math.abs(yaw) > MAX_ANGLE_RAD || Math.abs(pitch) > MAX_ANGLE_RAD || Math.abs(roll) > MAX_ANGLE_RAD) {
        return { ok: false, message: 'Mire directamente al frente sin girar ni inclinar la cabeza.' };
    }

    return { ok: true, embedding: Array.from(face.embedding) };
}

export default function FaceRegistration({ clientId, onRegistered }) {
    const videoRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState('Cargando modelos de IA...');

    useEffect(() => {
        let isMounted = true;
        let stream = null;

        const init = async () => {
            try {
                await human.load();
                await human.warmup();
                if (!isMounted) return;

                setStatus('Modelos listos. Iniciando cámara...');
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                });

                if (!isMounted) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                setLoading(false);
                setStatus('Coloque al cliente de frente a una distancia media.');
            } catch (err) {
                if (!isMounted) return;
                setStatus('Error al iniciar la cámara o los modelos.');
                console.error(err);
            }
        };

        init();

        return () => {
            isMounted = false;
            if (stream) stream.getTracks().forEach((track) => track.stop());
        };
    }, []);

    const captureAndRegister = async () => {
        if (!videoRef.current || submitting) return;

        if (!clientId) {
            setStatus('Error: falta el identificador del cliente.');
            return;
        }

        setSubmitting(true);
        setStatus('Procesando rostro...');

        try {
            const videoEl = videoRef.current;
            const vw = videoEl.videoWidth || 640;
            const vh = videoEl.videoHeight || 480;

            const result = await human.detect(videoEl);

            if (!result.face || result.face.length === 0) {
                setStatus('No se detectó ningún rostro. Intente de nuevo.');
                return;
            }

            if (result.face.length > 1) {
                setStatus('Se detectó más de un rostro. Solo debe haber una persona frente a la cámara.');
                return;
            }

            const check = validateFaceCapture(result.face[0], vw, vh);
            if (!check.ok) {
                setStatus(check.message);
                return;
            }

            const response = await fetch('/api/clients/register-face', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId, userId: clientId, embedding: check.embedding }),
            });

            const data = await response.json();
            if (response.ok) {
                setStatus('¡Registro facial completado con éxito!');
                if (onRegistered) onRegistered(data);
            } else {
                setStatus(`Error: ${data.message || 'No se pudo completar el registro.'}`);
            }
        } catch (err) {
            console.error(err);
            setStatus('Error de red al guardar el registro.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center p-4">
            <h2 className="text-xl font-bold mb-2">Registro Biométrico - Recepción</h2>
            <p className="text-sm text-gray-600 mb-4">{status}</p>
            <div className="relative border-4 border-gray-300 rounded-lg overflow-hidden">
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="w-[640px] h-[480px] object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                />
            </div>
            <button
                type="button"
                onClick={captureAndRegister}
                disabled={loading || submitting}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
                {submitting ? 'Guardando...' : 'Capturar y Registrar Rostro'}
            </button>
        </div>
    );
}