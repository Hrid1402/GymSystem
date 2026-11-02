import { pool } from './index.js';

const TODAY_LIMA = `(now() AT TIME ZONE 'America/Lima')::date`;

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
        COUNT(p.id)::int as payment_count
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
            EXTRACT(ISODOW FROM (created_at AT TIME ZONE 'America/Lima'))::int as day_index,
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

    return {
        kpis: {
        currentMonthRevenue: currentMonthRes.rows[0]?.revenue || 0,
        activeMemberships: activeRes.rows[0]?.count || 0,
        todayAccesses: todayAccessRes.rows[0]?.count || 0,
        },
        charts: {
        revenueComparison: revenueCompRes.rows,
        peakHours: peakHoursRes.rows,
        revenueByPlan: revenueByPlanRes.rows,
        avgAccessByDay: avgAccessDayRes.rows,
        },
        tables: {
        upcomingExpirations: expirationsRes.rows,
        }
    };
}