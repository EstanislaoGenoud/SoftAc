import { useNavigate, useParams } from "react-router-dom";
import "../styles/StudentCard.css";

function StudentCard({ student }) {
  const navigate = useNavigate();
  const { id, courseId } = useParams();

  function handleCardClick() {
    navigate(`/escuelas/${id}/cursos/${courseId}/alumnos/${student.id}`);
  }

  const fullName = `${student.nombre || ''} ${student.apellido || ''}`.trim() || student.name;
  const dni = student.identificacion || student.dni || 'Sin DNI';

  return (
    <article className="student-card" onClick={handleCardClick}>
      <div className="student-icon"></div>

      <div className="student-info">
        <h2>{fullName}</h2>
        <p>DNI: {dni}</p>
      </div>

      <span>→</span>
    </article>
  );
}

export default StudentCard;