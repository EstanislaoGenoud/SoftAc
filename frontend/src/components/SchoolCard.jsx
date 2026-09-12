import { useNavigate } from "react-router-dom";
import "../styles/SchoolCard.css";


function SchoolCard({ school, onDeleteSchool }) {
    const navigate = useNavigate();

    return (
        <article className="school-card">
            <h2>{school.name}</h2>

            <p>{school.city}</p>

            <p>
                {school.courses} cursos . {school.students} alumnos

            </p>

            <button onClick={() => navigate(`/escuelas/${school.id}`)}>
                Ingresar
            </button>

            <div className="school-card-actions">
                <button
                    onClick={() => navigate(`/escuelas/${school.id}/editar`)}
                >
                    Editar
                </button>

                <button onClick={() => {
                    const confirmed = window.confirm(
                        `¿Querés eliminar la escuela "${school.name}"?`
                    );
                    if (confirmed) {
                        onDeleteSchool(school.id);
                    }
                }}
                >
                    Eliminar
                </button>
            </div>

        </article>
    );
}

export default SchoolCard;