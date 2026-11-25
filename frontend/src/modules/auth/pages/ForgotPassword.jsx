import { useState } from "react";
import "../styles/ForgotPassword.css";
import { PlusIcon } from "@/shared/components/Icon";

function ForgotPassword() {

    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

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
                        <PlusIcon /> Enviar instrucciones
                    </button>

                </form>

                {message && (
                    <p className="forgot-password-message">
                        {message}
                    </p>
                )}

            </section>

        </main>
    );
}

export default ForgotPassword;
