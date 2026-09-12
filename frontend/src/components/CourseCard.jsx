import { useNavigate, useParams } from "react-router-dom";
import "../styles/CourseCard.css";

function CourseCard({ course }) {
  const navigate = useNavigate();
  const { id } = useParams();



  function handleCardClick() {
    navigate(`/escuelas/${id}/cursos/${course.id}`);
  }

  return (
    <article className="course-card"
      onClick={handleCardClick}>
      <div className="course-icon">
      </div>

      <div className="course-info">
        <h2>{course.name}</h2>

        <p>
          {course.year}° año · División {course.division}
        </p>

        <p>
          Turno {course.shift} · {course.students} alumnos
        </p>
      </div>
      <span>→</span>
    </article>
  );
}

export default CourseCard;