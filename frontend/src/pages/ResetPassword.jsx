import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ResetPassword.css";

function ResetPassword() {

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");

    const navigate = useNavigate();
//
    function handleSubmit(event) {
        event.preventDefault();

        if (!password || !confirmPassword) {
            setMessage("Completá los dos campos.");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("Las contraseñas no coinciden.");
            return;
        }

        setMessage("Contraseña actualizada correctamente.");

        setTimeout(() => {
            navigate("/login");
        }, 1500);
    }

    return (
        <main className="reset-password-page">

            <section className="reset-password-card">

                <h1>Crear nueva contraseña</h1>

                <p>
                    Ingresá tu nueva contraseña y confirmala
                    para completar el proceso.
                </p>

                <form onSubmit={handleSubmit}>

                    <label htmlFor="password">
                        Nueva contraseña
                    </label>

                    <input
                        id="password"
                        type="password"
                        placeholder="Ingresá tu nueva contraseña"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />

                    <label htmlFor="confirmPassword">
                        Confirmar contraseña
                    </label>

                    <input
                        id="confirmPassword"
                        type="password"
                        placeholder="Repetí tu nueva contraseña"
                        value={confirmPassword}
                        onChange={(event) =>
                            setConfirmPassword(event.target.value)
                        }
                    />

                    <button type="submit">
                        Cambiar contraseña
                    </button>

                </form>

                {message && (
                    <p className="reset-password-message">
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

export default ResetPassword;