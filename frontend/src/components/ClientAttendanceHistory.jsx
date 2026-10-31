import { useState, useEffect, useCallback } from 'react';
import { accessApi } from '../api';
import Loader from './common/Loader';
import '../styles/attendanceHistory.css';

export default function ClientAttendanceHistory({ onOpenQrModal }) {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await accessApi.getMyHistory({ page: 1, limit: 100 });
      setAttendances(res?.attendances || []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el historial de asistencias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDateTime = (dateString) => {
    if (!dateString) return { date: '-', time: '-' };
    const dateObj = new Date(dateString);
    const dateStr = dateObj.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = dateObj.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return { date: dateStr, time: timeStr };
  };

  // Métricas rápidas
  const totalVisits = attendances.length;
  const lastAttendance = attendances[0];
  const lastVisitFormatted = lastAttendance ? formatDateTime(lastAttendance.created_at) : null;

  // Visitas este mes
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const visitsThisMonth = attendances.filter((att) => {
    const d = new Date(att.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  return (
    <div className="attendance-history-container">
      {/* Tarjetas de estadísticas */}
      <div className="attendance-stats-grid">
        <div className="attendance-stat-card">
          <span className="attendance-stat-label">Total de Asistencias</span>
          <span className="attendance-stat-val primary">{totalVisits}</span>
          <span className="attendance-stat-sub">Entrenamientos registrados</span>
        </div>

        <div className="attendance-stat-card">
          <span className="attendance-stat-label">Visitas este mes</span>
          <span className="attendance-stat-val">{visitsThisMonth}</span>
          <span className="attendance-stat-sub">En el mes en curso</span>
        </div>

        <div className="attendance-stat-card">
          <span className="attendance-stat-label">Último Ingreso</span>
          {lastVisitFormatted ? (
            <>
              <span className="attendance-stat-val" style={{ fontSize: '1.25rem', marginTop: '4px' }}>
                {lastVisitFormatted.date}
              </span>
              <span className="attendance-stat-sub">{lastVisitFormatted.time}</span>
            </>
          ) : (
            <>
              <span className="attendance-stat-val" style={{ fontSize: '1.15rem', color: '#94a3b8' }}>
                Sin registros
              </span>
              <span className="attendance-stat-sub">Aún no has ingresado</span>
            </>
          )}
        </div>
      </div>

      {/* Tabla de asistencias */}
      <div className="attendance-table-card">
        <div className="attendance-table-header">
          <h3 className="attendance-table-title">Registro de Asistencias</h3>
          <button
            type="button"
            className="attendance-refresh-btn"
            onClick={fetchHistory}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Actualizar</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <Loader text="Cargando tus asistencias..." />
          </div>
        ) : error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#dc2626' }}>
            {error}
          </div>
        ) : attendances.length === 0 ? (
          <div className="attendance-empty-state">
            <div className="attendance-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h4 className="attendance-empty-title">Aún no registras asistencias</h4>
            <p className="attendance-empty-desc">
              Cuando ingreses al gimnasio mediante tu código QR o DNI, tus visitas quedarán guardadas aquí.
            </p>
            {onOpenQrModal && (
              <button
                type="button"
                className="btn-primary"
                onClick={onOpenQrModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Generar mi Pase QR</span>
              </button>
            )}
          </div>
        ) : (
          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Plan de Membresía</th>
                  <th>Método de Ingreso</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map((att) => {
                  const { date, time } = formatDateTime(att.created_at);
                  const isQr = att.entry_method !== 'manual_dni';

                  return (
                    <tr key={att.id}>
                      <td>
                        <div className="attendance-date-cell">
                          <span className="attendance-date-main">{date}</span>
                          <span className="attendance-time-sub">{time}</span>
                        </div>
                      </td>
                      <td>
                        <strong>{att.plan_name || 'Plan General'}</strong>
                      </td>
                      <td>
                        <span className={`method-badge ${isQr ? 'qr' : 'manual_dni'}`}>
                          {isQr ? (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                              </svg>
                              <span>QR Dinámico</span>
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                              <span>DNI Manual</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>
                        {att.registered_by_name || 'Recepción'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
