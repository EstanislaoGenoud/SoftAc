import { useNavigate, useParams } from "react-router-dom";
import {
  CheckIcon,
  CourseIcon,
  StudentIcon,
  TaskIcon,
  CalendarIcon
} from "@/shared/components/Icon";
import "../styles/CourseDetail.css";

export function CourseMetricsGrid({
  attendancePercentage,
  academicAverage,
  studentCount,
  unsubmittedCount = 0,
  ultimaClase
}) {
  const { id, courseId } = useParams();
  const navigate = useNavigate();

  function formatFecha(fechaStr) {
    if (!fechaStr) return "-";
    const clean = fechaStr.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return fechaStr;
  }

  const attendanceStatus =
    attendancePercentage === null
      ? "neutral"
      : attendancePercentage >= 75
      ? "good"
      : attendancePercentage >= 60
      ? "warning"
      : "danger";

  const gradeStatus =
    academicAverage === null
      ? "neutral"
      : academicAverage >= 7
      ? "good"
      : academicAverage >= 6
      ? "warning"
      : "danger";

  return (
    <section className="course-metrics-grid" aria-label="Métricas principales del curso">
      {/* 1. Asistencia general */}
      <article
        className={`course-metric-card metric-${attendanceStatus}`}
        onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/asistencia`)}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/escuelas/${id}/cursos/${courseId}/asistencia`);
          }
        }}
        aria-label={`Asistencia del curso: ${attendancePercentage ?? "Sin datos"}%`}
      >
        <div className="metric-header">
          <span className="metric-icon">
            <CheckIcon />
          </span>
          <span className="metric-tag">Asistencia</span>
        </div>
        <div className="metric-value">
          {attendancePercentage === null ? "—" : `${attendancePercentage}%`}
        </div>
        <p className="metric-hint">
          {attendancePercentage === null
            ? "Sin clases registradas"
            : attendancePercentage >= 75
            ? "Nivel óptimo"
            : "Por debajo del 75%"}
        </p>
      </article>

      {/* 2. Promedio académico */}
      <article
        className={`course-metric-card metric-${gradeStatus}`}
        onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/evaluaciones`)}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/escuelas/${id}/cursos/${courseId}/evaluaciones`);
          }
        }}
        aria-label={`Promedio general del curso: ${academicAverage ?? "Sin calificaciones"}`}
      >
        <div className="metric-header">
          <span className="metric-icon">
            <CourseIcon />
          </span>
          <span className="metric-tag">Promedio</span>
        </div>
        <div className="metric-value">
          {academicAverage === null ? "—" : academicAverage}
        </div>
        <p className="metric-hint">
          {academicAverage === null
            ? "Sin evaluaciones"
            : academicAverage >= 7
            ? "Rendimiento bueno"
            : "Rendimiento regular"}
        </p>
      </article>

      {/* 3. Alumnos inscriptos */}
      <article
        className="course-metric-card metric-neutral"
        onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/alumnos`)}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/escuelas/${id}/cursos/${courseId}/alumnos`);
          }
        }}
        aria-label={`Alumnos inscriptos: ${studentCount}`}
      >
        <div className="metric-header">
          <span className="metric-icon">
            <StudentIcon />
          </span>
          <span className="metric-tag">Alumnos</span>
        </div>
        <div className="metric-value">{studentCount}</div>
        <p className="metric-hint">Inscriptos regulares</p>
      </article>

      {/* 4. Trabajos adeudados (#329) */}
      <article
        className={`course-metric-card ${unsubmittedCount > 0 ? "metric-danger" : "metric-good"}`}
        onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/tareas`)}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/escuelas/${id}/cursos/${courseId}/tareas`);
          }
        }}
        aria-label={`Trabajos adeudados: ${unsubmittedCount}`}
      >
        <div className="metric-header">
          <span className="metric-icon">
            <TaskIcon />
          </span>
          <span className="metric-tag">Entregas</span>
        </div>
        <div className="metric-value">{unsubmittedCount}</div>
        <p className="metric-hint">
          {unsubmittedCount === 0 ? "Al día sin adeudos" : "Trabajos sin entregar"}
        </p>
      </article>

      {/* 5. Última clase dictada */}
      <article
        className="course-metric-card metric-neutral metric-full-mobile"
        onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/asistencia`)}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/escuelas/${id}/cursos/${courseId}/asistencia`);
          }
        }}
        aria-label="Última clase registrada"
      >
        <div className="metric-header">
          <span className="metric-icon">
            <CalendarIcon />
          </span>
          <span className="metric-tag">Última clase</span>
        </div>
        <div className="metric-value-text">
          {ultimaClase ? formatFecha(ultimaClase.fecha) : "Sin clases"}
        </div>
        <p className="metric-hint truncate">
          {ultimaClase?.tema || "Registrar primera clase"}
        </p>
      </article>
    </section>
  );
}

export default CourseMetricsGrid;
