import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSchoolById } from "../services/schoolService";
import "../styles/SchoolDashboard.css";

function SchoolDashboard() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [school, setSchool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchSchool() {
            try {
                const data = await getSchoolById(id);
                setSchool(data);
            } catch (err) {
                console.error("Error al obtener escuela:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }
        fetchSchool();
    }, [id]);

    if (loading) {
        return (
            <main className="school-dashboard">
                <header className="dashboard-header">
                    <h1>Cargando información...</h1>
                </header>
            </main>
        );
    }

    if (error || !school) {
        return (
            <main className="school-dashboard">
                <header className="dashboard-header">
                    <h1>Escuela no encontrada</h1>
                    <p className="dashboard-city">
                        La institución solicitada no existe o no tenés permiso para verla.
                    </p>
                    <button onClick={() => navigate("/escuelas")}>
                        Volver a mis escuelas
                    </button>
                </header>
            </main>
        );
    }

    const schoolName = school.nombre || school.name;
    const schoolCity = school.ciudad || school.city || "Sin ciudad asignada";
    const coursesCount = school.cursos ? school.cursos.length : (school.courses || 0);
    const studentsCount = school.students || 0; // Se implementará en el futuro

    return (
        <main className="school-dashboard">
            <header className="dashboard-header">
                <p className="dashboard-label">
                    Institución seleccionada
                </p>
                <h1>{schoolName}</h1>
                <p className="dashboard-city">{schoolCity}</p>
            </header>

            <section className="dashboard-stats">
                <article className="stat-card">
                    <span className="stat-icon">Cursos</span>
                    <div>
                        <strong>{coursesCount}</strong>
                        <p> Cursos</p>
                    </div>
                </article>

                <article className="stat-card">
                    <span className="stat-icon">Alumnos</span>
                    <div>
                        <strong>{studentsCount}</strong>
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
                <button 
                    className="edit-button" 
                    onClick={() => navigate(`/escuelas/${id}/editar`)}
                >
                    Editar escuela
                </button>

                <button 
                    className="delete-button"
                    onClick={() => navigate("/escuelas")}
                >
                    Volver al listado
                </button>
            </section>
        </main>
    );
}

export default SchoolDashboard;