import { useNavigate } from "react-router-dom";
import { PlusIcon, EditIcon, TrashIcon } from "@/shared/components/Icon";
import "../styles/SchoolCard.css";

function SchoolCard({ school, onDeleteSchool }) {
    const navigate = useNavigate();

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
                <PlusIcon /> Ingresar
            </button>

            <div className="school-card-actions">
                <button
                    onClick={() => navigate(`/escuelas/${school.id}/editar`)}
                >
                    <EditIcon /> Editar
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
                    <TrashIcon /> Eliminar
                </button>
            </div>

        </article>
    );
}

export default SchoolCard;
