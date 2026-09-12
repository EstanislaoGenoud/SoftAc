import { useNavigate, useParams } from "react-router-dom";
import courses from "../data/courses";
import "../styles/CourseDetail.css";

function CourseDetail() {
  const { id, courseId } = useParams();
  const navigate = useNavigate();

  const course = courses.find(
    (course) => course.id === Number(courseId)
  );

  if (!course) {
    return (
      <main className="course-detail-page">
        <section className="course-detail-card">
          <header className="course-detail-header">
            <span className="course-detail-kicker">Curso</span>
            <h1>Curso no encontrado</h1>
            <div className="course-detail-summary">
              <p>El curso solicitado no existe.</p>
            </div>
          </header>
        </section>
      </main>
    );
  }

  return (
    <main className="course-detail-page">
      <section className="course-detail-card">
        <header className="course-detail-header">
          <span className="course-detail-kicker">Curso seleccionado</span>
          <h1>{course.name}</h1>

          <div className="course-detail-summary">
            <p>{course.year}° año · División {course.division}</p>
            <p>Turno {course.shift}</p>
            <p className="course-detail-students">{course.students} alumnos</p>
          </div>
        </header>

        <section className="course-detail-management">
          <h2>Gestión del curso</h2>

          <div className="course-management-options">
            <button
              className="course-management-option"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/alumnos`)}
            >
              <span>Alumnos</span>
            </button>

            <button
              className="course-management-option"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/asistencia`)}
            >
              <span>Asistencia</span>
            </button>

            <button className="course-management-option">
              <span>Notas</span>
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default CourseDetail;