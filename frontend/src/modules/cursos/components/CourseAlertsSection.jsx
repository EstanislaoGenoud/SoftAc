import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CrossIcon } from "@/shared/components/Icon";
import { ALERT_SEVERITY } from "../services/dashboardMetrics";
import "../styles/CourseDetail.css";

export function CourseAlertsSection({ alerts = [] }) {
  const { id, courseId } = useParams();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) {
    return (
      <section className="course-alerts-container alerts-empty" aria-label="Alertas del curso">
        <div className="alerts-empty-box">
          <span className="alerts-empty-icon">✓</span>
          <div>
            <strong>Sin alertas activas</strong>
            <p>Todos los alumnos están al día con asistencia, entregas y rendimiento académico.</p>
          </div>
        </div>
      </section>
    );
  }

  const criticalCount = alerts.filter((a) => a.severidad === ALERT_SEVERITY.CRITICO).length;

  const visibleAlerts = expanded ? alerts : alerts.slice(0, 3);

  return (
    <section className="course-alerts-container" aria-label="Alertas prioritarias del curso">
      <header className="course-alerts-header">
        <div className="alerts-title-group">
          <span className="alerts-warning-badge" role="status">
            <CrossIcon /> {alerts.length} {alerts.length === 1 ? "alerta activa" : "alertas activas"}
          </span>
          <h2 id="course-alerts-heading">Atención requerida</h2>
        </div>
        {criticalCount > 0 && (
          <span className="alerts-critical-pill">
            {criticalCount} {criticalCount === 1 ? "caso crítico" : "casos críticos"}
          </span>
        )}
      </header>

      <div className="course-alerts-list">
        {visibleAlerts.map((alert) => (
          <article
            key={alert.id}
            className={`course-alert-item alert-severity-${alert.severidad.toLowerCase()}`}
            onClick={() =>
              navigate(`/escuelas/${id}/cursos/${courseId}/alumnos/${alert.alumnoId}`)
            }
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/escuelas/${id}/cursos/${courseId}/alumnos/${alert.alumnoId}`);
              }
            }}
            aria-label={`Ver ficha de ${alert.alumnoNombre}: ${alert.titulo}`}
          >
            <div className="alert-item-content">
              <div className="alert-item-header">
                <span className={`alert-badge alert-badge-${alert.severidad.toLowerCase()}`}>
                  {alert.severidad}
                </span>
                <span className="alert-type-tag">{alert.tipo}</span>
              </div>
              <h4 className="alert-item-title">{alert.titulo}</h4>
              <p className="alert-item-desc">{alert.descripcion}</p>
            </div>
            <span className="alert-arrow" aria-hidden="true">
              &rarr;
            </span>
          </article>
        ))}
      </div>

      {alerts.length > 3 && (
        <button
          type="button"
          className="btn-toggle-alerts"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded
            ? "Ver menos alertas"
            : `Ver ${alerts.length - 3} ${alerts.length - 3 === 1 ? "alerta más" : "alertas más"}...`}
        </button>
      )}
    </section>
  );
}

export default CourseAlertsSection;
