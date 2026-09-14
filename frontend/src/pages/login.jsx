import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { login, register } from "../services/authService";
import "../styles/Login.css";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false); // Estado para alternar entre Login y Registro

    const navigate = useNavigate();

    async function handleSubmit(event) {
        event.preventDefault();

        if (!email || !password) {
            alert("Completa el email y la contraseña");
            return;
        }

        try {
            if (isRegistering) {
                // Para registrar pedimos nombre y pasamos el email y password
                const nombre = email.split('@')[0]; // Nombre provisional basado en el email
                await register({ email, password, nombre });
                alert("¡Registro exitoso! Iniciando sesión...");
            }
            
            // Hacemos el Login real contra nuestro Backend
            await login(email, password);
            navigate("/escuelas");
            
        } catch (error) {
            alert(error.message);
        }
    }

    return (
        <main className="login-page">
            <section className="login-card">
                <div className="login-header">
                    <div className="login-logo"></div>
                    <h1>Gestion Academica</h1>
                    <p>Administra tus instituciones, cursos y alumnos desde un solo lugar.</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Ingresa tu correo"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Ingresa tu contraseña"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </div>

                    <button type="submit">
                        {isRegistering ? "Crear cuenta" : "Iniciar sesión"}
                    </button>
                    
                    <button type="button"
                        className="forgot-password-link"
                        onClick={() => setIsRegistering(!isRegistering)}
                        style={{ marginTop: '10px' }}
                    >
                        {isRegistering ? "¿Ya tienes cuenta? Inicia sesión aquí" : "¿No tienes cuenta? Regístrate aquí"}
                    </button>

                    {!isRegistering && (
                        <button type="button"
                            className="forgot-password-link"
                            onClick={() => navigate("/recuperar-contrasena")}
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    )}
                </form>
            </section>
        </main>
    );
}

export default Login;
