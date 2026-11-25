import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  StudentIcon,
  TaskIcon,
  CalendarIcon,
  CheckIcon,
  CrossIcon
} from "@/shared/components/Icon";
import { formatFecha, ENTREGA_ESTADOS } from "../services/tareaService";
import "../styles/Tasks.css";

export function UnsubmittedTasksList({
  trabajosNoEntregados = [],
  onMarkDelivered,
  compact = false
}) {
  const { id, courseId } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("STUDENT"); // 'STUDENT' | 'TASK'

  if (trabajosNoEntregados.length === 0) {
    return (
      <div className="tasks-empty-state">
        <CheckIcon style={{ fontSize: "2rem", color: "var(--accent)", marginBottom: "8px" }} />
        <h3>¡Al día! No hay trabajos adeudados</h3>
        <p>Todos los alumnos han completado sus entregas a tiempo.</p>
      </div>
    );
  }

  // Agrupado por Alumno
  const groupedByStudent = trabajosNoEntregados.reduce((acc, item) => {
    if (!acc[item.alumnoId]) {
      acc[item.alumnoId] = {
        alumnoId: item.alumnoId,
        alumnoNombre: item.alumnoNombre,
        alumnoDni: item.alumnoDni,
        tareas: []
      };
    }
    acc[item.alumnoId].tareas.push(item);
    return acc;
  }, {});

  const studentsList = Object.values(groupedByStudent);

  // Agrupado por Tarea
  const groupedByTask = trabajosNoEntregados.reduce((acc, item) => {
    if (!acc[item.tareaId]) {
      acc[item.tareaId] = {
        tareaId: item.tareaId,
        tareaTitulo: item.tareaTitulo,
        fechaEntrega: item.fechaEntrega,
        alumnos: []
      };
    }
    acc[item.tareaId].alumnos.push(item);
    return acc;
  }, {});

  const tasksList = Object.values(groupedByTask);

  return (
    <section className="unsubmitted-section" aria-label="Trabajos no entregados">
      {!compact && (
        <div className="unsubmitted-toolbar">
          <span className="unsubmitted-count-badge">
            <CrossIcon /> {trabajosNoEntregados.length} trabajos adeudados
          </span>
          <div className="unsubmitted-view-toggle" role="tablist">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "STUDENT" ? "active" : ""}`}
              onClick={() => setViewMode("STUDENT")}
              role="tab"
              aria-selected={viewMode === "STUDENT"}
            >
              <StudentIcon /> Por Alumno ({studentsList.length})
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "TASK" ? "active" : ""}`}
              onClick={() => setViewMode("TASK")}
              role="tab"
              aria-selected={viewMode === "TASK"}
            >
              <TaskIcon /> Por Tarea ({tasksList.length})
            </button>
          </div>
        </div>
      )}

      {/* Vista agrupada por Alumno */}
      {(viewMode === "STUDENT" || compact) && (
        <div className="unsubmitted-groups">
          {studentsList.map((st) => (
            <article key={st.alumnoId} className="unsubmitted-card">
              <header className="unsubmitted-card-header">
                <div className="unsubmitted-student-name">
                  <StudentIcon />
                  <div>
                    <h4>{st.alumnoNombre}</h4>
                    <small>DNI: {st.alumnoDni}</small>
                  </div>
                </div>
                <span className="unsubmitted-badge-count">
                  {st.tareas.length} {st.tareas.length === 1 ? "adeudo" : "adeudos"}
                </span>
              </header>

              <ul className="unsubmitted-task-items">
                {st.tareas.map((item) => (
                  <li key={`${item.tareaId}-${item.alumnoId}`} className="unsubmitted-item">
                    <div className="unsubmitted-item-info">
                      <strong>{item.tareaTitulo}</strong>
                      <span className="unsubmitted-item-date">
                        <CalendarIcon /> Venció: {formatFecha(item.fechaEntrega)}{" "}
                        {item.diasVencida > 0 && (
                          <span className="days-overdue-tag">
                            (hace {item.diasVencida} {item.diasVencida === 1 ? "día" : "días"})
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="unsubmitted-item-actions">
                      {onMarkDelivered ? (
                        <button
                          type="button"
                          className="btn-mark-delivered-compact"
                          onClick={() =>
                            onMarkDelivered(item.tareaId, item.alumnoId, ENTREGA_ESTADOS.ENTREGADO_TARDE)
                          }
                          title="Registrar entrega tardía"
                        >
                          <CheckIcon /> Marcar entrega
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-mark-delivered-compact"
                          onClick={() =>
                            navigate(
                              `/escuelas/${id}/cursos/${courseId}/tareas/${item.tareaId}`
                            )
                          }
                        >
                          Ver tarea &rarr;
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      {/* Vista agrupada por Tarea (en vista no compacta) */}
      {viewMode === "TASK" && !compact && (
        <div className="unsubmitted-groups">
          {tasksList.map((t) => (
            <article key={t.tareaId} className="unsubmitted-card">
              <header className="unsubmitted-card-header">
                <div className="unsubmitted-student-name">
                  <TaskIcon />
                  <div>
                    <h4>{t.tareaTitulo}</h4>
                    <small>Fecha de entrega: {formatFecha(t.fechaEntrega)}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-view-task-link"
                  onClick={() =>
                    navigate(`/escuelas/${id}/cursos/${courseId}/tareas/${t.tareaId}`)
                  }
                >
                  Gestionar &rarr;
                </button>
              </header>

              <ul className="unsubmitted-task-items">
                {t.alumnos.map((item) => (
                  <li key={`${item.tareaId}-${item.alumnoId}`} className="unsubmitted-item">
                    <div className="unsubmitted-item-info">
                      <strong>{item.alumnoNombre}</strong>
                      <small style={{ color: "var(--text)" }}>DNI: {item.alumnoDni}</small>
                    </div>

                    <div className="unsubmitted-item-actions">
                      {onMarkDelivered && (
                        <button
                          type="button"
                          className="btn-mark-delivered-compact"
                          onClick={() =>
                            onMarkDelivered(item.tareaId, item.alumnoId, ENTREGA_ESTADOS.ENTREGADO_TARDE)
                          }
                        >
                          <CheckIcon /> Marcar entregado
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default UnsubmittedTasksList;
