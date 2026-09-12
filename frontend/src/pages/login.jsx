import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "../styles/Login.css";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();


    function handleSubmit(event) {
        event.preventDefault();

        if (!email || !password) {
            alert("Completa el email y la contraseña");
            return;
        }

        localStorage.setItem("isLoggedIn", "true");

        navigate("/escuelas");

        console.log("Email:", email);
        console.log("Password:", password);
    }

    return (
        <main className="login-page">

            <section className="login-card">

                <div className="login-header">

                    <div className="login-logo">

                    </div>


                    <h1>Gestion Academica</h1>

                    <p>
                        Administra tus intituciones, cursos y alumnos
                        desde un solo lugar.
                    </p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            placeholder="Ingresa tu correo"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>


                    <div className="form-group">
                        <label htmlFor="password">
                            contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Ingresa tu contraseña"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </div>

                    <button type="submit">
                        Iniciar sesión
                    </button>

                    <button type="button"
                        className="forgot-password-link"
                        onClick={() => navigate("/recuperar-contrasena")}
                    >
                        ¿Olvidaste tu contraseña?
                    </button>

                </form>


            </section>
        </main>

    );
}

export default Login;
