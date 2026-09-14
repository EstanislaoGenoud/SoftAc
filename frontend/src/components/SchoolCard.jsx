import { useNavigate } from "react-router-dom";
import "../styles/SchoolCard.css";


function SchoolCard({ school, onDeleteSchool }) {
    const navigate = useNavigate();

    // Adaptamos para soportar la DB real (nombre, ciudad) o el mock (name, city)
    const schoolName = school.nombre || school.name;
    const schoolCity = school.ciudad || school.city || "Sin ciudad asignada";
    const coursesCount = school.cursos ? school.cursos.length : (school.courses || 0);
    const studentsCount = school.students || 0;

    return (
        <article className="school-card">
            <h2>{schoolName}</h2>

            <p>{schoolCity}</p>

            <p>
                {coursesCount} cursos . {studentsCount} alumnos

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
                        `¿Querés eliminar la escuela "${schoolName}"?`
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