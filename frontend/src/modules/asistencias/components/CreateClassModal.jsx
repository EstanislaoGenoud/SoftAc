import { useState } from "react";
import { createClase } from "../services/clasesService";
import { CalendarIcon, PlusIcon, CloseIcon } from "@/shared/components/Icon";

/**
 * HU-17: Formulario Modal para Registrar una Clase
 * Permite ingresar: fecha, tema, observaciones y estado.
 */
function CreateClassModal({ isOpen, onClose, cursoId, cursoNombre, onClassCreated }) {
  const hoy = new Date().toISOString().split("T")[0];

  const [fecha, setFecha] = useState(hoy);
  const [tema, setTema] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [estado, setEstado] = useState("DICTADA");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!fecha) {
      setErrorMsg("Por favor seleccioná una fecha válida.");
      return;
    }

    if (!tema.trim()) {
      setErrorMsg("El tema dictado de la clase es obligatorio.");
      return;
    }

    try {
      setIsSubmitting(true);
      const nuevaClase = await createClase({
        cursoMateriaId: cursoId,
        fecha,
        tema: tema.trim(),
        observaciones: observaciones.trim(),
        estado
      });

      // Limpiar formulario
      setTema("");
      setObservaciones("");
      setEstado("DICTADA");
      setFecha(hoy);

      if (onClassCreated) {
        onClassCreated(nuevaClase);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Error al registrar la clase.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="class-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="class-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="class-modal-header">
          <div>
            <span className="class-modal-kicker">
              {cursoNombre ? `Curso: ${cursoNombre}` : "Gestión de Clases"}
            </span>
            <h2>Registrar nueva clase</h2>
          </div>
          <button
            type="button"
            className="class-modal-close"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            <CloseIcon />
          </button>
        </header>

        {errorMsg && (
          <div className="class-modal-error" role="alert">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="class-modal-form">
          <div className="class-form-group">
            <label htmlFor="fechaClase">
              <CalendarIcon /> Fecha de la clase *
            </label>
            <input
              id="fechaClase"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div className="class-form-group">
            <label htmlFor="temaClase">Tema dictado *</label>
            <input
              id="temaClase"
              type="text"
              placeholder="Ej: Ecuaciones lineales de primer grado"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              required
            />
          </div>

          <div className="class-form-group">
            <label htmlFor="estadoClase">Estado de la clase</label>
            <select
              id="estadoClase"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="DICTADA">Dictada normalmente</option>
              <option value="SUSPENDIDA">Suspendida</option>
              <option value="FERIADO">Feriado / Asueto</option>
            </select>
          </div>

          <div className="class-form-group">
            <label htmlFor="observacionesClase">
              Observaciones pedagógicas (opcional)
            </label>
            <textarea
              id="observacionesClase"
              rows="3"
              placeholder="Ej: Se repasaron dudas del examen. Quedan ejercicios pendientes."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <footer className="class-modal-actions">
            <button
              type="button"
              className="class-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="class-btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando..." : <><PlusIcon /> Registrar clase</>}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default CreateClassModal;
