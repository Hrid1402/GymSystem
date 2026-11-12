import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import PasswordInput from "../components/common/PasswordInput";
import "../styles/register.css";
import {
  getEighteenYearsAgoDate,
  sanitizeDigitsOnly,
  sanitizeLettersOnly,
  validateDateOfBirth,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from "../utils/validators";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    tipo_documento: "dni",
    numero_documento: "",
    phone: "",
    date_of_birth: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const maxBirthDate = getEighteenYearsAgoDate();

  const handleDocTypeChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      tipo_documento: e.target.value,
      numero_documento: "", // Limpiar campo al cambiar de tipo
    }));
    setError("");
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    const fieldMap = {
      nombres: "first_name",
      apellidos: "last_name",
      tipoDocumento: "tipo_documento",
      numeroDocumento: "numero_documento",
      celular: "phone",
      fechaNacimiento: "date_of_birth",
      email: "email",
      password: "password",
      confirmPassword: "confirmPassword",
    };
    const fieldName = fieldMap[id] || id;

    let sanitizedValue = value;

    if (fieldName === "first_name" || fieldName === "last_name") {
      sanitizedValue = sanitizeLettersOnly(value);
    } else if (fieldName === "numero_documento") {
      // Eliminar espacios y símbolos especiales automáticamente según requerimiento
      if (formData.tipo_documento === "dni") {
        sanitizedValue = sanitizeDigitsOnly(value, 8); // Máximo 8 dígitos numéricos
      } else if (formData.tipo_documento === "carnet_extranjeria") {
        sanitizedValue = sanitizeDigitsOnly(value, 12); // Numérico hasta 12 (mínimo 9)
      } else {
        // Pasaporte: Alfanumérico limpio sin espacios ni símbolos especiales, máx 12
        sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      }
    } else if (fieldName === "phone") {
      sanitizedValue = sanitizeDigitsOnly(value, 9);
      if (sanitizedValue.length > 0 && sanitizedValue[0] !== '9') {
        setError("El celular debe iniciar con 9");
      } else {
        setError("");
      }
    } else if (fieldName === "date_of_birth") {
      const dobErr = value ? validateDateOfBirth(value) : "";
      setError(dobErr);
    }

    setFormData((prev) => ({ ...prev, [fieldName]: sanitizedValue }));
    if (fieldName !== "phone" && fieldName !== "date_of_birth") setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const docNum = formData.numero_documento.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const dob = formData.date_of_birth;

    const nameErr = validateName(firstName, "El nombre") || validateName(lastName, "El apellido");
    if (nameErr) {
      setError(nameErr);
      return;
    }

    // Validaciones estrictas de longitud y formato según la tabla de documentos
    if (formData.tipo_documento === "dni") {
      if (!/^\d{8}$/.test(docNum)) {
        setError("El DNI debe tener exactamente 8 dígitos numéricos sin espacios ni símbolos.");
        return;
      }
    } else if (formData.tipo_documento === "carnet_extranjeria") {
      if (!/^\d{9,12}$/.test(docNum)) {
        setError("El Carné de Extranjería debe tener entre 9 y 12 dígitos numéricos.");
        return;
      }
    } else if (formData.tipo_documento === "pasaporte") {
      if (!/^[a-zA-Z0-9]{6,12}$/.test(docNum)) {
        setError("El Pasaporte debe ser alfanumérico y tener entre 6 y 12 caracteres sin símbolos especiales.");
        return;
      }
    }

    const phoneErr = validatePhone(phone, false);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    const dobErr = validateDateOfBirth(dob, true);
    if (dobErr) {
      setError(dobErr);
      return;
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    const passErr = validatePassword(formData.password);
    if (passErr) {
      setError(passErr);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        first_name: firstName,
        last_name: lastName,
        tipo_documento: formData.tipo_documento,
        numero_documento: docNum,
        phone: phone || undefined,
        date_of_birth: dob,
        email,
        password: formData.password,
      });
      navigate("/login");
    } catch (err) {
      setError(err.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        {/* Logo */}
        <Link to="/" className="register-logo">
          <span className="register-logo-icon">+</span>
          <span>GymStark</span>
        </Link>

        {/* Título */}
        <h1>Registrarse</h1>
        <p className="register-description">Crea tu cuenta y empieza hoy</p>

        {error && <div className="form-error-banner" style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '13px' }}>{error}</div>}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          {/* Nombres */}
          <div className="register-input-group">
            <label htmlFor="nombres">Nombres *</label>
            <input
              id="nombres"
              type="text"
              placeholder="Nombres"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Apellidos */}
          <div className="register-input-group">
            <label htmlFor="apellidos">Apellidos *</label>
            <input
              id="apellidos"
              type="text"
              placeholder="Apellidos"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Tipo de Documento */}
          <div className="register-input-group">
            <label htmlFor="tipoDocumento">Tipo de Documento *</label>
            <select
              id="tipoDocumento"
              value={formData.tipo_documento}
              onChange={handleDocTypeChange}
              required
            >
              <option value="dni">DNI</option>
              <option value="carnet_extranjeria">Carné de Extranjería</option>
              <option value="pasaporte">Pasaporte</option>
            </select>
          </div>

          {/* Número de Documento */}
          <div className="register-input-group">
            <label htmlFor="numeroDocumento">Número de Documento *</label>
            <input
              id="numeroDocumento"
              type="text"
              placeholder={
                formData.tipo_documento === 'dni'
                  ? '8 dígitos numéricos'
                  : formData.tipo_documento === 'carnet_extranjeria'
                  ? '9 a 12 dígitos numéricos'
                  : '6 a 12 caracteres alfanuméricos'
              }
              maxLength={12}
              value={formData.numero_documento}
              onChange={handleChange}
              required
            />
          </div>

          {/* Celular */}
          <div className="register-input-group">
            <label htmlFor="celular">Celular</label>
            <input
              id="celular"
              type="tel"
              placeholder="Celular (9 dígitos)"
              maxLength="9"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {/* Fecha de nacimiento */}
          <div className="register-input-group">
            <label htmlFor="fechaNacimiento">Fecha de nacimiento *</label>
            <input
              id="fechaNacimiento"
              type="date"
              max={maxBirthDate}
              min="1900-01-01"
              value={formData.date_of_birth}
              onChange={handleChange}
              required
            />
          </div>

          {/* Correo */}
          <div className="register-input-group">
            <label htmlFor="email">Correo electrónico *</label>
            <input
              id="email"
              type="email"
              placeholder="Correo electrónico"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Contraseña */}
          <div className="register-input-group">
            <label htmlFor="password">Contraseña *</label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          {/* Confirmación de contraseña */}
          <div className="register-input-group">
            <label htmlFor="confirmPassword">Confirmar contraseña *</label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Repetir contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          {/* Botón */}
          <button type="submit" className="register-button" disabled={loading}>
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        {/* Login */}
        <p className="login-text">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;