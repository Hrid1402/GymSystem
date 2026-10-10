import { Link } from "react-router-dom";
import { plans } from "../data/plans";
import "../styles/landing.css";

function Landing() {
    return (
        <div>
            {/* Barra de navegación */}
            <header>
                <Link to="/" className="logo">
                    <span className="logo-icon">
                        ✚
                    </span>
                    <span>
                        GymStark
                    </span>
                </Link>

                <nav>
                    <a href="#planes">
                        Planes
                    </a>

                    <Link to="/login">
                        Iniciar sesión
                    </Link>

                    <Link to="/register">
                        Registrarse
                    </Link>
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
                        En GymFlow te acompañamos en cada paso.
                    </p>

                    <div>
                        <a href="#planes">
                            Ver planes
                        </a>

                        <Link to="/login">
                            Iniciar sesión
                        </Link>
                    </div>
                </section>


                {/* Planes */}
                <section id="planes">
                    <h2>
                        Nuestros planes
                    </h2>

                    <div>
                        {plans.map((plan) => (
                            <article key={plan.id}>
                                <h3>
                                    {plan.nombre}
                                </h3>
                                <p>
                                    {plan.descripcion}
                                </p>
                                <strong>
                                    S/ {plan.precio}
                                </strong>
                                <span>
                                    /mes
                                </span>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Landing;