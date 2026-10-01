import { useNavigate, useParams } from "react-router-dom";
import "../styles/CourseCard.css";

function CourseCard({ course }) {
  const navigate = useNavigate();
  const { id } = useParams();

  function handleCardClick() {
    navigate(`/escuelas/${id}/cursos/${course.id}`);
  }

  const courseName = course.nombre || course.name || "Sin nombre";
  const studentCount = course.cantidad_alumnos !== undefined ? course.cantidad_alumnos : (course.students || 0);

  return (
    <article className="course-card" onClick={handleCardClick}>
      <div className="course-icon"></div>

      <div className="course-info">
        <h2>{courseName}</h2>
        <p>{studentCount} alumnos inscritos</p>
      </div>
      <span>→</span>
    </article>
  );
}

export default CourseCard;
