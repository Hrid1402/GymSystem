import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { plansApi } from "../api/plansApi";
import { membershipsApi } from "../api/membershipsApi";
import { PATHS } from "../routes/paths";
import UserDropdown from "../components/common/UserDropdown";
import Loader from "../components/common/Loader";
import LegalFooter from "../components/layout/LegalFooter";
import "../styles/landing.css";

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [myMemberships, setMyMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingPlanId, setEnrollingPlanId] = useState(null);
  const [error, setError] = useState("");

  // Usuarios autenticados van directamente a su panel
  if (user) {
    if (user.role === "MANAGER") return <Navigate to={PATHS.USERS} replace />;
    if (user.role === "RECEPTIONIST") return <Navigate to={PATHS.CLIENTS} replace />;
    if (user.role === "CLIENT") return <Navigate to={PATHS.INICIO} replace />;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises = [plansApi.getPlans()];
        if (user && user.role === "CLIENT") {
          promises.push(membershipsApi.getMyMemberships().catch(() => ({ memberships: [] })));
        }

        const [plansRes, membershipsRes] = await Promise.all(promises);
        setPlans(plansRes?.plans || []);
        if (membershipsRes?.memberships) {
          setMyMemberships(membershipsRes.memberships);
        }
      } catch (err) {
        console.error("Error al obtener los datos:", err);
        setError("No se pudieron cargar los planes en este momento.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Saber si el usuario tiene una membresía activa actualmente
  const activeMembership = myMemberships.find((m) => m.status === "ACTIVE");

  const handleEnroll = async (plan) => {
    // Si no está autenticado, redirigir a Login
    if (!user) {
      navigate(PATHS.LOGIN);
      return;
    }

    // Si ya tiene una membresía activa
    if (activeMembership) {
      toast.error("Ya cuentas con una membresía activa. Debes cancelarla antes de inscribirte en otra.");
      return;
    }

    setEnrollingPlanId(plan.id);
    try {
      const res = await membershipsApi.enroll({ plan_id: plan.id });

      // Si Mercado Pago requiere checkout
      if (res?.payment_required) {
        const checkoutUrl = res.checkout_url || res.init_point || res.sandbox_init_point;

        if (checkoutUrl) {
          toast.info("Redirigiendo a la pasarela segura de Mercado Pago...");
          window.location.href = checkoutUrl;
          return;
        }
      }

      toast.success(`¡Te has inscrito al ${plan.name || "plan"} con éxito!`);
      const updated = await membershipsApi.getMyMemberships();
      setMyMemberships(updated?.memberships || []);
    } catch (err) {
      const msg = err.message || "Error al inscribirse al plan";
      toast.error(msg);
    } finally {
      setEnrollingPlanId(null);
    }
  };

  return (
    <div>
      {/* Barra de navegación */}
      <header>
        <Link to="/" className="logo">
          <span className="logo-icon">+</span>
          <span>GymStark</span>
        </Link>

        <nav>
          <a href="#planes">Planes</a>

          {user ? (
            <UserDropdown />
          ) : (
            <>
              <Link to={PATHS.LOGIN}>Iniciar sesión</Link>
              <Link to={PATHS.REGISTER}>Registrarse</Link>
            </>
          )}
        </nav>
      </header>

      {/* Sección principal */}
      <main>
        <section>
          <h1>
            {user ? `¡Hola, ${user.first_name}!` : "Tu mejor versión"}
            <br />
            {user ? "Listo para tu entrenamiento de hoy" : "empieza aquí"}
          </h1>

          <p>
            Entrena, cuídate, supera tus límites.
            <br />
            En GymStark te acompañamos en cada paso.
          </p>

          <div>
            {user ? (
              <>
                <Link to={PATHS.PROFILE}>Mi información</Link>
                <a href="#planes">Ver planes</a>
              </>
            ) : (
              <>
                <a href="#planes">Ver planes</a>
                <Link to={PATHS.LOGIN}>Iniciar sesión</Link>
              </>
            )}
          </div>
        </section>

        {/* Sección de Planes */}
        <section id="planes">
          <h2>Nuestros planes</h2>

          {loading ? (
            <div style={{ padding: "30px 0" }}>
              <Loader text="Cargando planes..." />
            </div>
          ) : error ? (
            <p style={{ color: "#dc2626", textAlign: "center", padding: "20px 0" }}>
              {error}
            </p>
          ) : (
            <div>
              {plans.map((plan) => {
                const planName = plan.name || plan.nombre;
                const planDesc = plan.description || plan.descripcion;
                const planPrice = plan.price ?? plan.precio;
                const planDuration = plan.duration_days ?? plan.duracion_dias;
                const isCurrentPlan = activeMembership && activeMembership.plan_id === plan.id;
                const isEnrollingThis = enrollingPlanId === plan.id;

                return (
                  <article key={plan.id}>
                    <div>
                      <h3>{planName}</h3>
                      <p>{planDesc || "Acceso ilimitado a nuestras instalaciones y entrenamientos."}</p>
                      <div className="plan-pricing">
                        <strong>S/ {Number(planPrice).toFixed(2)}</strong>
                        {planDuration && (
                          <span> / {planDuration} {planDuration === 1 ? 'día' : 'días'}</span>
                        )}
                      </div>
                    </div>

                    <div className="plan-card-action">
                      {isCurrentPlan ? (
                        <button type="button" className="btn-plan-active" disabled>
                          Plan Actual (Activo)
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-plan-enroll"
                          onClick={() => handleEnroll(plan)}
                          disabled={enrollingPlanId !== null || Boolean(activeMembership)}
                          title={
                            activeMembership
                              ? "Ya tienes una membresía activa"
                              : !user
                              ? "Inicia sesión para inscribirte"
                              : "Inscribirse ahora"
                          }
                        >
                          {isEnrollingThis ? "Inscribiendo..." : "Inscribirse"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {plans.length === 0 && (
                <p style={{ color: "#64748b", gridColumn: "1 / -1", textAlign: "center" }}>
                  No hay planes disponibles por el momento.
                </p>
              )}
            </div>
          )}
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}

export default Landing;