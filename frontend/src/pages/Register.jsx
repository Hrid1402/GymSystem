import { Link } from "react-router-dom";
import "../styles/register.css";

function Register() {
    return (
        <div className="register-page">

            <div className="register-card">
                {/* Logo */}
                <Link to="/" className="register-logo">
                    <span className="register-logo-icon">
                        ✚
                    </span>
                    <span>
                        GymFlow
                    </span>
                </Link>


                {/* Título */}
                <h1>
                    Registrarse
                </h1>
                <p className="register-description">
                    Crea tu cuenta y empieza hoy
                </p>


                {/* Formulario */}
                <form>
                    {/* Nombres */}
                    <div className="register-input-group">

                        <label htmlFor="nombres">
                            Nombres
                        </label>

                        <input
                            id="nombres"
                            type="text"
                            placeholder="Nombres"
                        />
                    </div>


                    {/* Apellidos */}
                    <div className="register-input-group">
                        <label htmlFor="apellidos">
                            Apellidos
                        </label>

                        <input
                            id="apellidos"
                            type="text"
                            placeholder="Apellidos"
                        />

                    </div>


                    {/* DNI */}
                    <div className="register-input-group">
                        <label htmlFor="dni">
                            DNI
                        </label>

                        <input
                            id="dni"
                            type="text"
                            placeholder="DNI"
                            maxLength="8"
                        />
                    </div>


                    {/* Celular */}
                    <div className="register-input-group">
                        <label htmlFor="celular">
                            Celular
                        </label>

                        <input
                            id="celular"
                            type="tel"
                            placeholder="Celular"
                            maxLength="9"
                        />
                    </div>


                    {/* Fecha de nacimiento */}
                    <div className="register-input-group">
                        <label htmlFor="fechaNacimiento">
                            Fecha de nacimiento
                        </label>

                        <input
                            id="fechaNacimiento"
                            type="date"
                        />
                    </div>


                    {/* Correo */}
                    <div className="register-input-group">
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
                    <div className="register-input-group">
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
                        className="register-button"
                    >
                        Registrarse
                    </button>

                </form>


                {/* Login */}
                <p className="login-text">
                    ¿Ya tienes una cuenta?
                    {" "}
                    <Link to="/login">
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Register;