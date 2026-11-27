import { useEffect, useState } from 'react';
import { Clock, DoorOpen, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '../../api/settingsApi';
import Loader from '../../components/common/Loader';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function Configuracion() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({
    maxCapacity: 50,
    totalRooms: 5,
    openingTime: '06:00',
    closingTime: '22:00',
  });

  useEffect(() => {
    let active = true;
    settingsApi
      .getSettings()
      .then((res) => {
        if (!active) return;
        const s = res?.settings;
        if (s) {
          setForm({
            maxCapacity: s.maxCapacity ?? 50,
            totalRooms: s.totalRooms ?? 5,
            openingTime: s.openingTime || '06:00',
            closingTime: s.closingTime || '22:00',
          });
        }
      })
      .catch((err) => {
        if (active) setErrorMsg(err.message || 'No se pudo cargar la configuración.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const maxCapacity = Number(form.maxCapacity);
    const totalRooms = Number(form.totalRooms);

    if (!Number.isInteger(maxCapacity) || maxCapacity < 1) {
      setErrorMsg('El aforo máximo debe ser un número entero mayor a 0.');
      return;
    }
    if (!Number.isInteger(totalRooms) || totalRooms < 1 || totalRooms > 50) {
      setErrorMsg('El número de salas debe estar entre 1 y 50.');
      return;
    }
    if (!form.openingTime || !form.closingTime || form.closingTime <= form.openingTime) {
      setErrorMsg('La hora de cierre debe ser posterior a la hora de apertura.');
      return;
    }

    setSaving(true);
    try {
      const res = await settingsApi.updateSettings({
        maxCapacity,
        totalRooms,
        openingTime: form.openingTime,
        closingTime: form.closingTime,
      });
      const updated = res?.settings;
      if (updated) {
        setForm({
          maxCapacity: updated.maxCapacity,
          totalRooms: updated.totalRooms,
          openingTime: updated.openingTime,
          closingTime: updated.closingTime,
        });
      }
      setSuccessMsg('Configuración del gimnasio actualizada correctamente.');
      toast.success('Configuración actualizada.');
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo actualizar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Configuración del Gimnasio">
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          }}
        >
          <h2 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', color: '#0f172a' }}>
            Parámetros Operativos
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#64748b' }}>
            Ajusta el aforo máximo permitido, las salas disponibles para clases grupales y el horario de atención.
          </p>

          {loading ? (
            <Loader text="Cargando configuración..." />
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorMsg && <div className="form-alert error">{errorMsg}</div>}
              {successMsg && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                  }}
                >
                  {successMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="cfg_capacity" style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} />
                    <span>Aforo máximo (personas)</span>
                  </label>
                  <input
                    id="cfg_capacity"
                    type="number"
                    min="1"
                    max="5000"
                    value={form.maxCapacity}
                    onChange={(e) => setForm((p) => ({ ...p, maxCapacity: e.target.value }))}
                    required
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="cfg_rooms" style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DoorOpen size={15} />
                    <span>Salas disponibles</span>
                  </label>
                  <input
                    id="cfg_rooms"
                    type="number"
                    min="1"
                    max="50"
                    value={form.totalRooms}
                    onChange={(e) => setForm((p) => ({ ...p, totalRooms: e.target.value }))}
                    required
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Salas habilitadas: Sala 1 {Number(form.totalRooms) > 1 ? `a Sala ${Number(form.totalRooms)}` : ''}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="cfg_open" style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} />
                    <span>Hora de apertura</span>
                  </label>
                  <input
                    id="cfg_open"
                    type="time"
                    value={form.openingTime}
                    onChange={(e) => setForm((p) => ({ ...p, openingTime: e.target.value }))}
                    required
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="cfg_close" style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} />
                    <span>Hora de cierre</span>
                  </label>
                  <input
                    id="cfg_close"
                    type="time"
                    value={form.closingTime}
                    onChange={(e) => setForm((p) => ({ ...p, closingTime: e.target.value }))}
                    required
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Guardando...' : 'Guardar configuración'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
