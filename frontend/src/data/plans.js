export const plans = [
    {
        id: "plan_001",
        name: "Plan Diario",
        descripcion: "Acceso completo a las instalaciones por 1 día ideal para visitas puntuales.",
        precio: 15.00,
        duration_days: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: "plan_002",
        name: "Plan Mensual Estándar",
        descripcion: "Membresía por 30 días con acceso a todas las áreas de musculación y cardio en horario regular.",
        precio: 120.00,
        duration_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: "plan_003",
        name: "Plan Trimestral Pro",
        descripcion: "Acceso ilimitado por 90 días incluye rutinas personalizadas y evaluaciones físicas mensuales.",
        precio: 320.00,
        duration_days: 90,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: "plan_004",
        name: "Plan Anual VIP",
        descripcion: "Membresía anual con beneficios exclusivos acceso total preferencial y congelamiento de membresía.",
        precio: 1100.00,
        duration_days: 365,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: "plan_005",
        name: "Plan Estudiantil Mensual",
        descripcion: "Tarifa especial por 30 días dirigida a estudiantes presentando carnet universitario vigente.",
        precio: 90.00,
        duration_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];