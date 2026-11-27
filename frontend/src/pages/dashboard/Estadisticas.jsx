import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { dashboardApi } from '../../api/dashboardApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/estadisticas.css';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function Estadisticas() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [capacityInput, setCapacityInput] = useState('');
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [capacityFeedback, setCapacityFeedback] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getDashboardData();
      setData(response);
      if (response?.capacity?.maxCapacity != null) {
        setCapacityInput(String(response.capacity.maxCapacity));
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCapacity = async (e) => {
    e.preventDefault();
    const value = Number(capacityInput);
    if (!Number.isInteger(value) || value <= 0) {
      setCapacityFeedback({
        type: 'error',
        text: 'Ingresa un número entero mayor a 0 para el aforo máximo.',
      });
      return;
    }

    try {
      setSavingCapacity(true);
      setCapacityFeedback(null);
      const res = await dashboardApi.updateCapacity(value);
      setData((prev) => ({
        ...prev,
        capacity: res.capacity,
      }));
      if (res?.capacity?.maxCapacity != null) {
        setCapacityInput(String(res.capacity.maxCapacity));
      }
      setCapacityFeedback({
        type: 'success',
        text: 'Aforo máximo actualizado correctamente.',
      });
    } catch (err) {
      setCapacityFeedback({
        type: 'error',
        text: err.response?.data?.error || err.message || 'No se pudo actualizar el aforo.',
      });
    } finally {
      setSavingCapacity(false);
    }
  };

  // Datos globales formateados
  const rawRevenueComp = data?.charts?.revenueComparison || [];
  const revenueComp = rawRevenueComp.map(item => ({
    name: item.period_label, // Ejemplo: "Septiembre 2026"
    ingresos: Number(item.total)
  }));

  const peakHours = (data?.charts?.peakHours || []).map(item => ({
    hora: `${item.hora || item.hour}:00 hrs`,
    accesos: item.total_accesses
  }));

  const revenueByPlan = (data?.charts?.revenueByPlan || []).map(item => ({
    name: item.plan_name,
    value: Number(item.total_revenue)
  }));

  const avgDays = (data?.charts?.avgAccessByDay || []).map(item => ({
    dia: item.day_name.trim(),
    promedio: Number(item.avg_accesses)
  }));

  // Ancho dinámico para el gráfico continuo si hay muchos meses
  const dynamicChartWidth = Math.max(revenueComp.length * 90, 500);

  const currentOccupancy = data?.capacity?.currentOccupancy ?? 0;
  const maxCapacity = data?.capacity?.maxCapacity ?? 50;
  const availableSpots = data?.capacity?.availableSpots ?? Math.max(maxCapacity - currentOccupancy, 0);
  const isFull = Boolean(data?.capacity?.isFull);

  return (
    <DashboardLayout title="Dashboard Gerencial">
      <div className="estadisticas-container">

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Cargando estadísticas gerenciales...</div>
        ) : error ? (
          <div style={{ color: '#dc2626', padding: '20px', background: '#fee2e2', borderRadius: '8px' }}>Error: {error}</div>
        ) : (
          <>
            {/* 1, 2 y 3. KPIS PRINCIPALES */}
            <div className="estadisticas-kpi-grid">
              <div className="estadisticas-card">
                <p className="estadisticas-card-title">Ingresos del Mes Presente</p>
                <h2 className="estadisticas-card-value-green">S/ {Number(data?.kpis?.currentMonthRevenue || 0).toFixed(2)}</h2>
              </div>
              <div className="estadisticas-card">
                <p className="estadisticas-card-title">Membresías Activas</p>
                <h2 className="estadisticas-card-value-blue">{data?.kpis?.activeMemberships}</h2>
              </div>
              <div className="estadisticas-card">
                <p className="estadisticas-card-title">Accesos al Gimnasio (Hoy)</p>
                <h2 className="estadisticas-card-value-purple">{data?.kpis?.todayAccesses}</h2>
              </div>
            </div>

            {/* CONTROL Y VISUALIZACIÓN DE AFORO */}
            <div className="estadisticas-card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div>
                  <h3 className="estadisticas-section-title" style={{ margin: '0 0 6px 0' }}>
                    Aforo del Gimnasio (En Tiempo Real)
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>
                    Asistencias abiertas sin salida hoy:{' '}
                    <strong style={{ color: isFull ? '#dc2626' : '#111827', fontSize: '16px' }}>
                      {currentOccupancy} / {maxCapacity}
                    </strong>{' '}
                    · Cupos disponibles: <strong>{availableSpots}</strong>
                    {isFull && (
                      <span
                        style={{
                          marginLeft: '10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#991b1b',
                          background: '#fee2e2',
                          padding: '2px 8px',
                          borderRadius: '999px',
                        }}
                      >
                        AFORO COMPLETO
                      </span>
                    )}
                  </p>
                </div>

                <form onSubmit={handleUpdateCapacity} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="maxCapacityInput" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                    Límite de aforo:
                  </label>
                  <input
                    id="maxCapacityInput"
                    type="number"
                    min="1"
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                    style={{
                      width: '92px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={savingCapacity}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: savingCapacity ? 'not-allowed' : 'pointer',
                      opacity: savingCapacity ? 0.7 : 1,
                    }}
                  >
                    {savingCapacity ? 'Guardando...' : 'Actualizar Aforo'}
                  </button>
                </form>
              </div>

              {capacityFeedback && (
                <p
                  style={{
                    marginTop: '10px',
                    marginBottom: 0,
                    fontSize: '13px',
                    fontWeight: 500,
                    color: capacityFeedback.type === 'error' ? '#dc2626' : '#059669',
                  }}
                >
                  {capacityFeedback.text}
                </p>
              )}
            </div>

            {/* 4. GRÁFICO CONTINUO DE INGRESOS POR MES */}
            <div className="estadisticas-card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 className="estadisticas-section-title" style={{ margin: 0 }}>Histórico Continuo de Ingresos por Mes (S/)</h3>
                <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>Global / Desplazable</span>
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 15px 0' }}>
                Basado en la fecha exacta de contratación o pago. Desliza horizontalmente si hay más períodos.
              </p>

              <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '10px' }}>
                <div style={{ width: `${dynamicChartWidth}px`, height: '320px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueComp} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip formatter={(value) => [`S/ ${value.toFixed(2)}`, 'Ingresos']} />
                      <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 5, 6 y 7. OTROS GRÁFICOS GLOBALES */}
            <div className="estadisticas-content-grid">

              {/* Horas pico */}
              <div className="estadisticas-card" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
                <h3 className="estadisticas-section-title" style={{ margin: '0 0 15px 0' }}>Horas con Mayor Concurrencia (Global)</h3>
                <div style={{ flex: 1, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHours}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="hora" stroke="#6b7280" fontSize={11} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip formatter={(value) => [`${value} accesos`, 'Visitas']} />
                      <Bar dataKey="accesos" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ingresos por Plan */}
              <div className="estadisticas-card" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
                <h3 className="estadisticas-section-title" style={{ margin: '0 0 15px 0' }}>Ingresos por Tipo de Membresía (Global)</h3>
                <div style={{ flex: 1, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueByPlan}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {revenueByPlan.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`S/ ${value.toFixed(2)}`, 'Total']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            <div className="estadisticas-content-grid" style={{ marginTop: '24px' }}>

              {/* Promedio de accesos por día */}
              <div className="estadisticas-card" style={{ height: '380px', display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                <h3 className="estadisticas-section-title" style={{ margin: '0 0 15px 0' }}>Promedio de Accesos por Día de la Semana (Global)</h3>
                <div style={{ flex: 1, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={avgDays}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="dia" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip formatter={(value) => [`${value} visitas`, 'Promedio']} />
                      <Bar dataKey="promedio" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* 8. TABLA DE PRÓXIMOS VENCIMIENTOS */}
            <div className="estadisticas-card" style={{ marginTop: '24px' }}>
              <h3 className="estadisticas-section-title">Próximos Vencimientos de Membresías (Siguientes 7 Días)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="estadisticas-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Email</th>
                      <th>Plan</th>
                      <th>Fecha de Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.tables?.upcomingExpirations?.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.first_name} {item.last_name}</td>
                        <td style={{ color: '#6b7280' }}>{item.email}</td>
                        <td style={{ color: '#4b5563' }}>{item.plan_name}</td>
                        <td style={{ color: '#dc2626', fontWeight: 'bold' }}>{new Date(item.end_date).toLocaleDateString('es-ES')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data?.tables?.upcomingExpirations?.length === 0 && (
                  <p className="estadisticas-empty">No hay membresías por vencer próximamente.</p>
                )}
              </div>
            </div>

          </>
        )}

      </div>
    </DashboardLayout>
  );
}