import { useNavigate, useParams } from "react-router-dom";
import schools from "../data/schools";
import "../styles/SchoolDashboard.css";

function SchoolDashboard() {
    const { id } = useParams();
    const navigate = useNavigate();

    const school = schools.find(
        (school) => school.id === Number(id)
    );

    if (!school) {
        return (
            <main className="school-dashboard">
                <header className="dashboard-header">
                    <h1>Escuela no encontrada</h1>
                    <p className="dashboard-city">
                        La institución solicitada no existe.
                    </p>
                    <button onClick={() => navigate("/escuelas")}>
                        Volver a mis escuelas
                    </button>
                </header>
            </main>
        );
    }

    return (
        <main className="school-dashboard">
            <header className="dashboard-header">

                <p className="dashboard-label">
                    Institucion seleccionada
                </p>

                <h1>{school.name}</h1>

                <p className="dashboard-city">
                    {school.city}
                </p>
            </header>

            <section className="dashboard-stats">

                <article className="stat-card">
                    <span className="stat-icon">Cursos</span>

                    <div>
                        <strong>{school.courses}</strong>
                        <p> Cursos</p>
                    </div>
                </article>


                <article className="stat-card">
                    <span className="stat-icon">Alumnos</span>

                    <div>
                        <strong>{school.students}</strong>
                        <p> Alumnos</p>
                    </div>
                </article>

            </section>

            <section className="dashboard-options">

                <h2>Gestión académica</h2>

                <button
                    className="dashboard-option"
                    onClick={() => navigate(`/escuelas/${id}/cursos`)}
                >
                    <span>
                        <strong>Cursos</strong>
                        <small>Administrar cursos</small>
                    </span>
                    →
                </button>

                <button className="dashboard-option">
                    <span>
                        <strong>Alumnos</strong>
                        <small>Consultar alumnos</small>
                    </span>
                    →
                </button>

                <button className="dashboard-option">
                    <span>
                        <strong>Asistencia</strong>
                        <small>Registrar asistencia</small>
                    </span>
                    →
                </button>

                <button className="dashboard-option">
                    <span>
                        <strong>Notas</strong>
                        <small>Gestionar calificaciones</small>
                    </span>
                    →
                </button>

            </section>

            <section className="dashboard-actions">

                <button className="edit-button">
                    Editar escuela
                </button>

                <button className="delete-button">
                    Eliminar escuela
                </button>

            </section>

        </main>
    );
}

export default SchoolDashboard;