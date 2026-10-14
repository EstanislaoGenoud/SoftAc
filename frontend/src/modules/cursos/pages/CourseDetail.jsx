import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourseById } from "../services/courseService";
import { ArrowLeftIcon, StudentIcon, CheckIcon, CourseIcon } from "@/shared/components/Icon";
import "../styles/CourseDetail.css";

function CourseDetail() {
  const { id, courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourse() {
      try {
        const data = await getCourseById(courseId);
        setCourse(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [courseId]);

  if (loading) return <main className="course-detail-page"><h1>Cargando...</h1></main>;

  if (!course) {
    return (
      <main className="course-detail-page">
        <section className="course-detail-card">
          <header className="course-detail-header">
            <span className="course-detail-kicker">Curso</span>
            <h1>Curso no encontrado</h1>
            <button onClick={() => navigate(`/escuelas/${id}/cursos`)}><ArrowLeftIcon /> Volver a cursos</button>
          </header>
        </section>
      </main>
    );
  }

  return (
    <main className="course-detail-page">
      <section className="course-detail-card">
        <header className="course-detail-header">
          <button className="logout-button" style={{marginBottom: '1rem'}} onClick={() => navigate(`/escuelas/${id}/cursos`)}>
            <ArrowLeftIcon /> Volver a Cursos
          </button>
          <br/>
          <span className="course-detail-kicker">
            Curso seleccionado en {course.escuela ? course.escuela.nombre : ''}
          </span>
          <h1>{course.nombre || course.name}</h1>

          <div className="course-detail-summary">
            <p className="course-detail-students">
              {course.cantidad_alumnos !== undefined ? course.cantidad_alumnos : 0} alumnos
            </p>
          </div>

          <dl className="course-detail-info">
            <dt>Escuela</dt>
            <dd>{course.escuela?.nombre || "Sin escuela"}</dd>
            <dt>Curso</dt>
            <dd>{course.nombre || course.name || "-"}</dd>
          </dl>
        </header>

        <section className="course-detail-management">
          <h2>Gestión del curso</h2>

          <div className="course-management-options">
            <button
              className="course-management-option"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/alumnos`)}
            >
              <span><StudentIcon /> Alumnos</span>
              <small>Ver listado de alumnos</small>
            </button>

            <button
              className="course-management-option"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/asistencia`)}
            >
              <span><CheckIcon /> Asistencia</span>
              <small>Registrar asistencia</small>
            </button>

            <button className="course-management-option" disabled title="Próximamente">
              <span><CourseIcon /> Notas</span>
              <small>Próximamente</small>
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default CourseDetail;
