import { pool } from './index.js';

const TODAY_LIMA = `(now() AT TIME ZONE 'America/Lima')::date`;
const DEFAULT_MAX_CAPACITY = 50;

export async function getMaxCapacity() {
  const { rows } = await pool.query(
    `SELECT max_capacity FROM gym_settings WHERE id = 'default'`
  );
  return rows[0]?.max_capacity ?? DEFAULT_MAX_CAPACITY;
}

export async function updateMaxCapacity(maxCapacity) {
  const parsed = Number(maxCapacity);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('El aforo máximo debe ser un número entero mayor a 0');
  }

  const { rows } = await pool.query(
    `INSERT INTO gym_settings (id, max_capacity, updated_at)
     VALUES ('default', $1, NOW())
     ON CONFLICT (id)
     DO UPDATE SET max_capacity = EXCLUDED.max_capacity, updated_at = NOW()
     RETURNING max_capacity`,
    [parsed]
  );
  return rows[0].max_capacity;
}

export async function getCurrentOccupancy() {
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT user_id)::int AS current_occupancy
     FROM attendances
     WHERE exited_at IS NULL
       AND (created_at AT TIME ZONE 'America/Lima')::date = ${TODAY_LIMA}`
  );
  return rows[0]?.current_occupancy ?? 0;
}

export async function getCapacityStatus() {
  const [maxCapacity, currentOccupancy] = await Promise.all([
    getMaxCapacity(),
    getCurrentOccupancy(),
  ]);

  return {
    maxCapacity,
    currentOccupancy,
    availableSpots: Math.max(maxCapacity - currentOccupancy, 0),
    isFull: currentOccupancy >= maxCapacity,
  };
}

export async function getDashboardDataModel() {
  // 1. KPI: Ingresos del mes presente
  const currentMonthRevenueQuery = `
    SELECT COALESCE(SUM(amount), 0) AS revenue
    FROM payments
    WHERE status = 'approved'
      AND EXTRACT(MONTH FROM (created_at AT TIME ZONE 'America/Lima')) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'America/Lima'))
      AND EXTRACT(YEAR FROM (created_at AT TIME ZONE 'America/Lima')) = EXTRACT(YEAR FROM (now() AT TIME ZONE 'America/Lima'));
  `;
  const currentMonthRes = await pool.query(currentMonthRevenueQuery);

  // 2. KPI: Membresías activas
  const activeMembershipsQuery = `
    SELECT COUNT(*)::int AS count
    FROM memberships
    WHERE status = 'ACTIVE' AND end_date >= ${TODAY_LIMA};
  `;
  const activeRes = await pool.query(activeMembershipsQuery);

  // 3. KPI: Accesos de hoy
  const todayAccessQuery = `
    SELECT COUNT(*)::int AS count
    FROM attendances
    WHERE (created_at AT TIME ZONE 'America/Lima')::date = ${TODAY_LIMA};
  `;
  const todayAccessRes = await pool.query(todayAccessQuery);

  // 4. Gráfico: Histórico continuo de ingresos por mes y año (Meses en Español)
  const revenueComparisonQuery = `
    SELECT
      TO_CHAR((created_at AT TIME ZONE 'America/Lima'), 'YYYY-MM') AS year_month,
      (CASE EXTRACT(MONTH FROM (created_at AT TIME ZONE 'America/Lima'))::int
        WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
        WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
        WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
        WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
      END || ' ' || EXTRACT(YEAR FROM (created_at AT TIME ZONE 'America/Lima'))) AS period_label,
      SUM(amount) AS total
    FROM payments
    WHERE status = 'approved'
    GROUP BY year_month, period_label
    ORDER BY year_month ASC;
  `;
  const revenueCompRes = await pool.query(revenueComparisonQuery);

  // 5. Gráfico: Horas con mayor concurrencia (Global)
  const peakHoursQuery = `
    SELECT
      EXTRACT(HOUR FROM (created_at AT TIME ZONE 'America/Lima'))::int AS hour,
      COUNT(*)::int AS total_accesses
    FROM attendances
    GROUP BY EXTRACT(HOUR FROM (created_at AT TIME ZONE 'America/Lima'))
    ORDER BY hour ASC;
  `;
  const peakHoursRes = await pool.query(peakHoursQuery);

  // 6. Gráfico: Ingresos por tipo de membresía (Global)
  const revenueByPlanQuery = `
    SELECT
      pl.name AS plan_name,
      COALESCE(SUM(p.amount), 0) AS total_revenue,
      COUNT(p.id)::int AS payment_count
    FROM payments p
    JOIN plans pl ON p.plan_id = pl.id
    WHERE p.status = 'approved'
    GROUP BY pl.name;
  `;
  const revenueByPlanRes = await pool.query(revenueByPlanQuery);

  // 7. Gráfico: Promedio de accesos por día de la semana (Días en Español)
  const avgAccessByDayOfWeekQuery = `
    WITH daily_counts AS (
      SELECT
        (created_at AT TIME ZONE 'America/Lima')::date AS access_date,
        EXTRACT(ISODOW FROM (created_at AT TIME ZONE 'America/Lima'))::int AS day_index,
        COUNT(*)::int AS daily_total
      FROM attendances
      GROUP BY access_date, day_index
    )
    SELECT
      CASE day_index
        WHEN 1 THEN 'Lunes'
        WHEN 2 THEN 'Martes'
        WHEN 3 THEN 'Miércoles'
        WHEN 4 THEN 'Jueves'
        WHEN 5 THEN 'Viernes'
        WHEN 6 THEN 'Sábado'
        WHEN 7 THEN 'Domingo'
      END AS day_name,
      day_index,
      ROUND(AVG(daily_total), 1) AS avg_accesses
    FROM daily_counts
    GROUP BY day_index
    ORDER BY day_index ASC;
  `;
  const avgAccessDayRes = await pool.query(avgAccessByDayOfWeekQuery);

  // 8. Tabla: Próximos vencimientos
  const expirationsQuery = `
    SELECT m.id, m.end_date, u.first_name, u.last_name, u.email, p.name AS plan_name
    FROM memberships m
    JOIN users u ON m.user_id = u.id
    JOIN plans p ON m.plan_id = p.id
    WHERE m.status = 'ACTIVE'
      AND m.end_date >= ${TODAY_LIMA}
      AND m.end_date <= ${TODAY_LIMA} + INTERVAL '7 days'
    ORDER BY m.end_date ASC;
  `;
  const expirationsRes = await pool.query(expirationsQuery);

  // 9. Aforo actual y límite configurado
  const capacity = await getCapacityStatus();

  return {
    kpis: {
      currentMonthRevenue: currentMonthRes.rows[0]?.revenue || 0,
      activeMemberships: activeRes.rows[0]?.count || 0,
      todayAccesses: todayAccessRes.rows[0]?.count || 0,
    },
    capacity,
    charts: {
      revenueComparison: revenueCompRes.rows,
      peakHours: peakHoursRes.rows,
      revenueByPlan: revenueByPlanRes.rows,
      avgAccessByDay: avgAccessDayRes.rows,
    },
    tables: {
      upcomingExpirations: expirationsRes.rows,
    },
  };
}