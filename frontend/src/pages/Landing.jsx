import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { plansApi } from "../api/plansApi";
import { PATHS } from "../routes/paths";
import UserDropdown from "../components/common/UserDropdown";
import Loader from "../components/common/Loader";
import "../styles/landing.css";

function Landing() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Gerente y Recepcionista van directamente al panel administrativo
  if (user && (user.role === "MANAGER" || user.role === "RECEPTIONIST")) {
    return <Navigate to={PATHS.USERS} replace />;
  }

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await plansApi.getPlans();
        setPlans(response?.plans || []);
      } catch (err) {
        console.error("Error al obtener los planes:", err);
        setError("No se pudieron cargar los planes en este momento.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

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

                return (
                  <article key={plan.id}>
                    <h3>{planName}</h3>
                    <p>{planDesc}</p>
                    <strong>S/ {planPrice}</strong>
                    <span>/mes</span>
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
    </div>
  );
}

export default Landing;