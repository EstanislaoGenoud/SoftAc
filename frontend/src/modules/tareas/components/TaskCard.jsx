import { useNavigate, useParams } from "react-router-dom";
import { CalendarIcon, CheckIcon, StudentIcon } from "@/shared/components/Icon";
import { formatFecha, isTareaVencida } from "../services/tareaService";
import "../styles/Tasks.css";

export function TaskCard({ tarea, entregasSummary }) {
  const { id, courseId } = useParams();
  const navigate = useNavigate();
  const vencida = isTareaVencida(tarea.fechaEntrega);

  function handleNavigateDeliveries(e) {
    e.stopPropagation();
    navigate(`/escuelas/${id}/cursos/${courseId}/tareas/${tarea.id}`);
  }

  return (
    <article
      className={`task-card ${vencida ? "task-card-vencida" : ""}`}
      tabIndex={0}
      onClick={handleNavigateDeliveries}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavigateDeliveries(e);
        }
      }}
      aria-label={`Tarea ${tarea.titulo}, fecha de entrega ${formatFecha(tarea.fechaEntrega)}`}
    >
      <div className="task-card-header">
        <div className="task-card-title-group">
          <h3 className="task-card-title">{tarea.titulo}</h3>
          {tarea.descripcion && (
            <p className="task-card-desc">{tarea.descripcion}</p>
          )}
        </div>
        <span
          className={`task-badge ${vencida ? "task-badge-vencida" : "task-badge-vigente"}`}
          role="status"
        >
          {vencida ? "Vencida" : "Vigente"}
        </span>
      </div>

      {entregasSummary && (
        <div className="task-card-stats">
          <span className="task-stat-item">
            <CheckIcon /> {entregasSummary.entregados} / {entregasSummary.total} entregados
          </span>
          {entregasSummary.noEntregados > 0 && (
            <span className="task-stat-alert">
              {entregasSummary.noEntregados} sin entregar
            </span>
          )}
        </div>
      )}

      <div className="task-card-footer">
        <span className="task-card-date">
          <CalendarIcon /> Fecha de entrega: <strong>{formatFecha(tarea.fechaEntrega)}</strong>
        </span>
        <button
          type="button"
          className="task-btn-deliveries"
          onClick={handleNavigateDeliveries}
          aria-label={`Gestionar entregas para ${tarea.titulo}`}
        >
          <StudentIcon /> Gestionar entregas &rarr;
        </button>
      </div>
    </article>
  );
}

export default TaskCard;
