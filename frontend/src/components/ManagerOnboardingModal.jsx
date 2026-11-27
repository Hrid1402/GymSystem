import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, DoorOpen, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { settingsApi } from '../api/settingsApi';
import { PATHS } from '../routes/paths';

export default function ManagerOnboardingModal({ isManager }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [maxCapacity, setMaxCapacity] = useState(50);
  const [totalRooms, setTotalRooms] = useState(5);
  const [openingTime, setOpeningTime] = useState('06:00');
  const [closingTime, setClosingTime] = useState('22:00');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isManager) return;
    let active = true;
    settingsApi
      .getSettings()
      .then((res) => {
        if (!active) return;
        const s = res?.settings;
        if (s && !s.isConfigured) {
          setMaxCapacity(s.maxCapacity ?? 50);
          setTotalRooms(s.totalRooms ?? 5);
          setOpeningTime(s.openingTime || '06:00');
          setClosingTime(s.closingTime || '22:00');
          setVisible(true);
        }
      })
      .catch(() => {
        // No bloquear si falla la consulta inicial
      });
    return () => {
      active = false;
    };
  }, [isManager]);

  if (!isManager || !visible) return null;

  const handleNextStep = () => {
    setErrorMsg('');
    if (!acceptTerms) {
      setErrorMsg('Debes aceptar los términos y condiciones para continuar.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cap = Number(maxCapacity);
    const rooms = Number(totalRooms);
    if (!Number.isInteger(cap) || cap < 1) {
      setErrorMsg('El aforo máximo debe ser un número entero mayor a 0.');
      return;
    }
    if (!Number.isInteger(rooms) || rooms < 1 || rooms > 50) {
      setErrorMsg('El número de salas debe estar entre 1 y 50.');
      return;
    }
    if (!openingTime || !closingTime || closingTime <= openingTime) {
      setErrorMsg('La hora de cierre debe ser posterior a la hora de apertura.');
      return;
    }

    setSaving(true);
    try {
      await settingsApi.completeOnboarding({
        acceptTerms: true,
        maxCapacity: cap,
        totalRooms: rooms,
        openingTime,
        closingTime,
      });
      setVisible(false);
      window.dispatchEvent(new CustomEvent('gym-settings-updated'));
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo guardar la configuración inicial.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 2000,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={22} color="#2563eb" />
            <h2 id="onboarding-modal-title" style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
              Configuración Inicial del Gimnasio
            </h2>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '999px',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
            }}
          >
            Paso {step} de 2
          </span>
        </div>

        {errorMsg && (
          <div className="form-alert error" style={{ marginBottom: '14px' }}>
            {errorMsg}
          </div>
        )}

        {step === 1 ? (
          <div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
              Antes de comenzar a operar GymStark, revisa y acepta los términos de uso administrativo, control de aforo, facturación electrónica y protección de datos.
            </p>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '0.84rem',
                color: '#334155',
                lineHeight: 1.5,
                marginBottom: '14px',
              }}
            >
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>El gerente es responsable de definir el aforo máximo y las salas habilitadas del local.</li>
                <li>Las clases grupales se programarán dentro del horario de atención configurado.</li>
                <li>
                  Consulta el documento completo en{' '}
                  <Link to={PATHS.TERMS} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
                    Términos y Condiciones
                  </Link>
                  .
                </li>
              </ul>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '0.875rem',
                color: '#0f172a',
                cursor: 'pointer',
                marginBottom: '18px',
              }}
            >
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{ marginTop: '3px', width: '16px', height: '16px' }}
              />
              <span>Acepto los términos y condiciones de operación del sistema GymStark.</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-primary" onClick={handleNextStep}>
                Continuar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
              Define los parámetros operativos del gimnasio. Podrás modificarlos más adelante desde <strong>Configuración</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="onb_capacity" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} />
                  <span>Aforo máximo (personas)</span>
                </label>
                <input
                  id="onb_capacity"
                  type="number"
                  min="1"
                  max="5000"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  required
                  style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="onb_rooms" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DoorOpen size={15} />
                  <span>Número de salas para clases</span>
                </label>
                <input
                  id="onb_rooms"
                  type="number"
                  min="1"
                  max="50"
                  value={totalRooms}
                  onChange={(e) => setTotalRooms(e.target.value)}
                  required
                  style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Se habilitarán: Sala 1 {Number(totalRooms) > 1 ? `a Sala ${Number(totalRooms)}` : ''}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="onb_open" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} />
                  <span>Hora de apertura</span>
                </label>
                <input
                  id="onb_open"
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  required
                  style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="onb_close" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} />
                  <span>Hora de cierre</span>
                </label>
                <input
                  id="onb_close"
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  required
                  style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <button type="button" className="btn-secondary" onClick={() => setStep(1)} disabled={saving}>
                Atrás
              </button>
              <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                <span>{saving ? 'Guardando...' : 'Guardar y comenzar'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
