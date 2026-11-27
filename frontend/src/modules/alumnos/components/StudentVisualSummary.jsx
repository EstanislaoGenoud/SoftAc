import { CheckIcon, CrossIcon, CourseIcon, TaskIcon } from "@/shared/components/Icon";
import "../styles/Students.css";

export function StudentVisualSummary({
  attendancePercentage,
  academicAverage,
  taskSummary = { total: 0, entregados: 0, noEntregados: 0, pendientes: 0, porcentajeCumplimiento: 100 }
}) {
  const hasAttendance = attendancePercentage !== null && attendancePercentage !== undefined;
  const hasAverage = academicAverage !== null && academicAverage !== undefined;

  const isAttendanceRisk = hasAttendance && attendancePercentage < 75;
  const isGradeRisk = hasAverage && academicAverage < 6;
  const isTaskRisk = taskSummary.noEntregados > 0;

  const isAtRisk = isAttendanceRisk || isGradeRisk || isTaskRisk;
  const isOutstanding =
    hasAttendance &&
    attendancePercentage >= 85 &&
    hasAverage &&
    academicAverage >= 8 &&
    taskSummary.noEntregados === 0;

  const standing = isAtRisk ? "EN RIESGO" : isOutstanding ? "DESTACADO" : "REGULAR";

  return (
    <section className="student-visual-summary" aria-label="Resumen visual del alumno">
      <div className="visual-summary-header">
        <div>
          <span className="visual-summary-kicker">Evaluación integral</span>
          <h3 className="visual-summary-title">Desempeño académico global</h3>
        </div>
        <span className={`standing-badge standing-${standing.toLowerCase().replace(" ", "-")}`}>
          {isAtRisk ? <CrossIcon /> : <CheckIcon />} {standing}
        </span>
      </div>

      {isAtRisk && (
        <div className="student-alert-box" role="alert">
          <strong>Atención requerida:</strong>
          <ul>
            {isAttendanceRisk && (
              <li>Asistencia por debajo del 75% ({attendancePercentage}%).</li>
            )}
            {isGradeRisk && (
              <li>Promedio académico menor a 6.0 ({academicAverage}).</li>
            )}
            {isTaskRisk && (
              <li>
                Adeuda {taskSummary.noEntregados}{" "}
                {taskSummary.noEntregados === 1 ? "trabajo vencido" : "trabajos vencidos"}.
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="visual-metrics-grid">
        {/* 1. Métrica visual de Asistencia */}
        <article className="visual-metric-card">
          <div className="visual-metric-top">
            <span className="visual-metric-icon">
              <CheckIcon />
            </span>
            <span className="visual-metric-label">Asistencia</span>
          </div>
          <div className="visual-metric-num">
            {hasAttendance ? `${attendancePercentage}%` : "—"}
          </div>
          <div className="progress-bar-container" role="progressbar" aria-valuenow={attendancePercentage ?? 0} aria-valuemin="0" aria-valuemax="100">
            <div
              className={`progress-bar-fill ${
                !hasAttendance
                  ? "fill-neutral"
                  : attendancePercentage >= 75
                  ? "fill-good"
                  : attendancePercentage >= 60
                  ? "fill-warning"
                  : "fill-danger"
              }`}
              style={{ width: `${Math.min(100, attendancePercentage ?? 0)}%` }}
            />
            <span className="progress-marker-75" title="Umbral mínimo 75%" />
          </div>
          <small className="visual-metric-sub">
            {hasAttendance
              ? attendancePercentage >= 75
                ? "Cumple el mínimo requerido"
                : "Riesgo de inasistencia"
              : "Sin asistencias tomadas"}
          </small>
        </article>

        {/* 2. Métrica visual de Calificaciones */}
        <article className="visual-metric-card">
          <div className="visual-metric-top">
            <span className="visual-metric-icon">
              <CourseIcon />
            </span>
            <span className="visual-metric-label">Promedio general</span>
          </div>
          <div className="visual-metric-num">
            {hasAverage ? academicAverage : "—"}
          </div>
          <div className="progress-bar-container" role="progressbar" aria-valuenow={hasAverage ? academicAverage * 10 : 0} aria-valuemin="0" aria-valuemax="100">
            <div
              className={`progress-bar-fill ${
                !hasAverage
                  ? "fill-neutral"
                  : academicAverage >= 7
                  ? "fill-good"
                  : academicAverage >= 6
                  ? "fill-warning"
                  : "fill-danger"
              }`}
              style={{ width: `${hasAverage ? Math.min(100, academicAverage * 10) : 0}%` }}
            />
          </div>
          <small className="visual-metric-sub">
            {hasAverage
              ? academicAverage >= 8
                ? "Sobresaliente"
                : academicAverage >= 6
                ? "Aprobado regular"
                : "Requiere apoyo pedagógico"
              : "Sin evaluaciones cargadas"}
          </small>
        </article>

        {/* 3. Métrica visual de Tareas */}
        <article className="visual-metric-card">
          <div className="visual-metric-top">
            <span className="visual-metric-icon">
              <TaskIcon />
            </span>
            <span className="visual-metric-label">Cumplimiento de tareas</span>
          </div>
          <div className="visual-metric-num">
            {taskSummary.total > 0
              ? `${taskSummary.entregados} / ${taskSummary.total}`
              : "—"}
          </div>
          <div className="progress-bar-container" role="progressbar" aria-valuenow={taskSummary.porcentajeCumplimiento} aria-valuemin="0" aria-valuemax="100">
            <div
              className={`progress-bar-fill ${
                taskSummary.total === 0
                  ? "fill-neutral"
                  : taskSummary.noEntregados === 0
                  ? "fill-good"
                  : "fill-danger"
              }`}
              style={{ width: `${taskSummary.porcentajeCumplimiento}%` }}
            />
          </div>
          <small className="visual-metric-sub">
            {taskSummary.total === 0
              ? "No hay tareas creadas"
              : taskSummary.noEntregados === 0
              ? `${taskSummary.porcentajeCumplimiento}% completado`
              : `${taskSummary.noEntregados} adeudadas sin entregar`}
          </small>
        </article>
      </div>
    </section>
  );
}

export default StudentVisualSummary;
