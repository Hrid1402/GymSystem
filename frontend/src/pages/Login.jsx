import { Link } from "react-router-dom";
import "../styles/login.css";

function Login() {
    return (
        <div className="login-page">

            <div className="login-card">

                {/* Logo */}
                <Link to="/" className="login-logo">
                    <span className="login-logo-icon">
                        ✚
                    </span>
                    <span>
                        GymFlow
                    </span>
                </Link>


                {/* Título */}
                <h1>
                    Iniciar sesión
                </h1>
                <p className="login-description">
                    Accede a tu cuenta para continuar
                </p>


                {/* Formulario */}
                <form>
                    {/* Correo */}
                    <div className="input-group">
                        <label htmlFor="email">
                            Correo electrónico
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Correo electrónico"
                        />
                    </div>


                    {/* Contraseña */}
                    <div className="input-group">
                        <label htmlFor="password">
                            Contraseña
                        </label>

                        <input
                            id="password"
                            type="password"
                            placeholder="Contraseña"
                        />
                    </div>


                    {/* Botón */}
                    <button
                        type="submit"
                        className="login-button"
                    >
                        Ingresar
                    </button>
                </form>


                {/* Registro */}
                <p className="register-text">
                    ¿No tienes una cuenta?
                    {" "}
                    <Link to="/register">
                        Regístrate
                    </Link>
                </p>

            </div>

        </div>
    );
}

export default Login;