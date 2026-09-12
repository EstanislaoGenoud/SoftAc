import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ForgotPassword.css";

function ForgotPassword() {

    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

    const navigate = useNavigate();

    function handleSubmit(event) {
        event.preventDefault();

        if (!email) {
            setMessage("Ingresá tu correo electrónico.");
            return;
        }

        setMessage(
            "Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña."
        );
    }

    return (
        <main className="forgot-password-page">

            <section className="forgot-password-card">

                <h1>Recuperar contraseña</h1>

                <p>
                    Ingresá tu correo electrónico y te enviaremos
                    instrucciones para recuperar tu contraseña.
                </p>

                <form onSubmit={handleSubmit}>

                    <label htmlFor="email">
                        Correo electrónico
                    </label>

                    <input
                        id="email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />

                    <button type="submit">
                        Enviar instrucciones
                    </button>

                </form>

                {message && (
                    <p className="forgot-password-message">
                        {message}
                    </p>
                )}

                <button
                    type="button"
                    className="back-login-button"
                    onClick={() => navigate("/login")}
                >
                    ← Volver al Login
                </button>

            </section>

        </main>
    );
}

export default ForgotPassword;