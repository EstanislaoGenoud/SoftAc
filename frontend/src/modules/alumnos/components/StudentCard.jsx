import { useNavigate, useParams } from "react-router-dom";
import { StudentIcon } from "@/shared/components/Icon";
import "../styles/StudentCard.css";

function StudentCard({ student }) {
  const navigate = useNavigate();
  const { id, courseId } = useParams();

  function handleCardClick() {
    navigate(`/escuelas/${id}/cursos/${courseId}/alumnos/${student.id}`);
  }

  const fullName = `${student.nombre || ''} ${student.apellido || ''}`.trim() || student.name;
  const dni = student.identificacion || student.dni || 'Sin DNI';
  // La API filtra alumnos REGULAR al listar; si viene campo propio, lo usamos.
  const estado = student.estado || student.estado_academico || 'REGULAR';

  return (
    <article className="student-card" onClick={handleCardClick}>
      <div className="student-icon"><StudentIcon /></div>

      <div className="student-info">
        <h2>{fullName}</h2>
        <p>DNI: {dni}</p>
        <p className={`student-estado estado-${estado.toLowerCase()}`}>Estado: {estado}</p>
      </div>

      <span>→</span>
    </article>
  );
}

export default StudentCard;
