import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/landing.css";

function Landing() {
    // Estados para guardar los planes y controlar la carga
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    // Se ejecuta al cargar la página para obtener los datos del backend
    useEffect(() => {
        fetch("http://localhost:3000/api/plans")
            .then((res) => res.json())
            .then((data) => {
                setPlans(data.plans || []); // Guarda los planes obtenidos
                setLoading(false);          // Apaga el estado de carga
            })
            .catch((err) => {
                console.error("Error al conectar con el backend:", err);
                setLoading(false);
            });
    }, []);

    return (
        <div>
            {/* Barra de navegación */}
            <header>
                <Link to="/" className="logo">
                    <span className="logo-icon">✚</span>
                    <span>GymStark</span>
                </Link>

                <nav>
                    <a href="#planes">Planes</a>
                    <Link to="/login">Iniciar sesión</Link>
                    <Link to="/register">Registrarse</Link>
                </nav>
            </header>

            {/* Sección principal */}
            <main>
                <section>
                    <h1>
                        Tu mejor versión
                        <br />
                        empieza aquí
                    </h1>
                    <p>
                        Entrena, cuídate, supera tus límites.
                        <br />
                        En GymStark te acompañamos en cada paso.
                    </p>
                    <div>
                        <a href="#planes">Ver planes</a>
                        <Link to="/login">Iniciar sesión</Link>
                    </div>
                </section>

                {/* Sección de Planes */}
                <section id="planes">
                    <h2>Nuestros planes</h2>

                    {/* Muestra "Cargando..." o las tarjetas según corresponda */}
                    {loading ? (
                        <p>Cargando planes...</p>
                    ) : (
                        <div>
                            {/* Recorre el arreglo de planes para renderizar cada tarjeta */}
                            {plans.map((plan) => (
                                <article key={plan.id}>
                                    <h3>{plan.nombre}</h3>
                                    <p>{plan.descripcion}</p>
                                    <strong>S/ {plan.precio}</strong>
                                    <span>/mes</span>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default Landing;