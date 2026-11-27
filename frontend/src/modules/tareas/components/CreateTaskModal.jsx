import { useState } from "react";
import { CloseIcon, PlusIcon } from "@/shared/components/Icon";
import { createTarea } from "../services/tareaService";
import "../styles/Tasks.css";

function getDefaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

function TaskFormModalBody({ cursoId, cursoNombre, onClose, onTaskCreated }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState(getDefaultDueDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!titulo.trim()) {
      setError("El título de la tarea es obligatorio.");
      return;
    }

    if (!fechaEntrega) {
      setError("La fecha de entrega es obligatoria.");
      return;
    }

    setSubmitting(true);
    try {
      const nueva = await createTarea({
        cursoId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fechaEntrega
      });
      if (onTaskCreated) {
        onTaskCreated(nueva);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Error al registrar la tarea.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="task-modal-card">
      <header className="task-modal-header">
        <div>
          <span className="task-modal-kicker">
            {cursoNombre || "Curso"}
          </span>
          <h2 id="task-modal-title">Nueva tarea</h2>
        </div>
        <button
          type="button"
          className="task-modal-close"
          onClick={onClose}
          aria-label="Cerrar ventana"
          disabled={submitting}
        >
          <CloseIcon />
        </button>
      </header>

      {error && (
        <div className="task-modal-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="task-form">
        <div className="task-form-group">
          <label htmlFor="task-title">
            Título de la tarea <span className="req">*</span>
          </label>
          <input
            id="task-title"
            type="text"
            className="task-input"
            placeholder="Ej: Trabajo Práctico Nº 1 - Historia"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            disabled={submitting}
            maxLength={120}
            required
            autoFocus
          />
        </div>

        <div className="task-form-group">
          <label htmlFor="task-due-date">
            Fecha de entrega <span className="req">*</span>
          </label>
          <input
            id="task-due-date"
            type="date"
            className="task-input"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className="task-form-group">
          <label htmlFor="task-description">
            Descripción o consignas (opcional)
          </label>
          <textarea
            id="task-description"
            className="task-textarea"
            placeholder="Detallá los requisitos, lecturas recomendadas o formato de entrega..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={submitting}
            rows={3}
          />
        </div>

        <footer className="task-modal-actions">
          <button
            type="button"
            className="task-btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="task-btn-primary"
            disabled={submitting}
          >
            <PlusIcon /> {submitting ? "Guardando..." : "Crear tarea"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function CreateTaskModal({ isOpen, onClose, cursoId, cursoNombre, onTaskCreated }) {
  if (!isOpen) return null;

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="task-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      onClick={handleOverlayClick}
    >
      <TaskFormModalBody
        cursoId={cursoId}
        cursoNombre={cursoNombre}
        onClose={onClose}
        onTaskCreated={onTaskCreated}
      />
    </div>
  );
}

export default CreateTaskModal;
