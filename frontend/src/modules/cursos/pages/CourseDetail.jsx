import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourseById } from "../services/courseService";
import { getUltimaClase } from "@/modules/asistencias";
import { getClasesByCursoMateria } from "@/modules/asistencias/services/clasesService";
import { calculateAttendancePercentage, getAttendance } from "@/modules/asistencias/services/attendanceService";
import { ArrowLeftIcon, StudentIcon, CheckIcon, CourseIcon, CalendarIcon } from "@/shared/components/Icon";
import "../styles/CourseDetail.css";

function CourseDetail() {
  const { id, courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ultimaClase, setUltimaClase] = useState(null);
  const [loadingClase, setLoadingClase] = useState(true);
  const [attendancePercentage, setAttendancePercentage] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setLoadingClase(true);
        const [courseData, claseData] = await Promise.all([
          getCourseById(courseId),
          getUltimaClase(courseId)
        ]);
        setCourse(courseData);
        setUltimaClase(claseData);

        const classes = await getClasesByCursoMateria(courseId);
        const records = [];
        for (const currentClass of classes) {
          const attendance = await getAttendance(currentClass.id);
          records.push(...Object.values(attendance));
        }
        setAttendancePercentage(calculateAttendancePercentage(records));
      } catch (error) {
        console.error("Error al cargar detalle del curso o última clase:", error);
      } finally {
        setLoading(false);
        setLoadingClase(false);
      }
    }
    fetchData();
  }, [courseId]);

  function formatearFecha(fechaStr) {
    if (!fechaStr) return "-";
    const partes = fechaStr.split("T")[0].split("-");
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaStr;
  }

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
            <p className="course-detail-attendance-summary">
              Asistencia del curso: <strong>{attendancePercentage === null ? "Sin datos" : `${attendancePercentage}%`}</strong>
            </p>
          </div>

          <dl className="course-detail-info">
            <dt>Escuela</dt>
            <dd>{course.escuela?.nombre || "Sin escuela"}</dd>
            <dt>Curso</dt>
            <dd>{course.nombre || course.name || "-"}</dd>
          </dl>
        </header>

        {/* HU-18: Consultar última clase registrada */}
        <section className="course-last-class-section" aria-labelledby="last-class-heading">
          <div className="course-last-class-header">
            <h2 id="last-class-heading">
              <CalendarIcon /> Última clase registrada
            </h2>
            {ultimaClase && (
              <button
                type="button"
                className="last-class-link-action"
                onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/asistencia`)}
              >
                Ver asistencias &rarr;
              </button>
            )}
          </div>

          {loadingClase ? (
            <p className="last-class-hint">Cargando última clase...</p>
          ) : ultimaClase ? (
            <article className="last-class-card">
              <div className="last-class-badge-container">
                <span className="last-class-date-tag">
                  {formatearFecha(ultimaClase.fecha)}
                </span>
                <span className={`last-class-status-tag status-${(ultimaClase.estado || "dictada").toLowerCase()}`}>
                  {ultimaClase.estado || "DICTADA"}
                </span>
              </div>

              <h3 className="last-class-topic">
                {ultimaClase.tema || "Tema no especificado"}
              </h3>

              {ultimaClase.observaciones ? (
                <p className="last-class-obs">
                  <strong>Observaciones:</strong> {ultimaClase.observaciones}
                </p>
              ) : (
                <p className="last-class-obs-empty">Sin observaciones registradas.</p>
              )}
            </article>
          ) : (
            <div className="last-class-empty-box">
              <p>Todavía no se ha registrado ninguna clase en este curso.</p>
              <button
                type="button"
                className="btn-create-first-class"
                onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/asistencia`)}
              >
                Registrar primera clase
              </button>
            </div>
          )}
        </section>

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

            <button
              className="course-management-option"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/evaluaciones`)}
            >
              <span><CourseIcon /> Evaluaciones</span>
              <small>Crear y consultar evaluaciones</small>
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
