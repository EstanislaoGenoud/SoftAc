import { useState } from "react";
import { enrollStudent } from "../services/studentService";
import { StudentIcon, PlusIcon, CloseIcon } from "@/shared/components/Icon";

/**
 * Formulario Modal para Inscribir / Cargar Alumnos a un Curso
 * Conecta con el endpoint real: POST /alumnos/inscribir
 */
function CreateStudentModal({ isOpen, onClose, cursoId, cursoNombre, onStudentEnrolled }) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!nombre.trim()) {
      setErrorMsg("El nombre del alumno es obligatorio.");
      return;
    }

    if (!apellido.trim()) {
      setErrorMsg("El apellido del alumno es obligatorio.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await enrollStudent({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        identificacion: identificacion.trim() || undefined,
        cursoId
      });

      // El backend devuelve { alumno, inscripcion }
      const newStudent = res.alumno || {
        id: res.id || `alumno-${Date.now()}`,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        identificacion: identificacion.trim() || "",
        estado: "REGULAR"
      };

      setNombre("");
      setApellido("");
      setIdentificacion("");

      if (onStudentEnrolled) {
        onStudentEnrolled(newStudent, { alumnoExistente: Boolean(res.alumno_existente) });
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Error al inscribir el alumno.");
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
              {cursoNombre ? `Curso: ${cursoNombre}` : "Inscripción"}
            </span>
            <h2>Inscribir nuevo alumno</h2>
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
            <label htmlFor="studentNombre">
              <StudentIcon /> Nombre del alumno *
            </label>
            <input
              id="studentNombre"
              type="text"
              placeholder="Ej: Sofía"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="class-form-group">
            <label htmlFor="studentApellido">Apellido del alumno *</label>
            <input
              id="studentApellido"
              type="text"
              placeholder="Ej: Gómez"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              required
            />
          </div>

          <div className="class-form-group">
            <label htmlFor="studentDni">DNI / Identificación (opcional)</label>
            <input
              id="studentDni"
              type="text"
              placeholder="Ej: 43890123"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
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
              <PlusIcon /> {isSubmitting ? "Inscribiendo..." : "Inscribir alumno"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default CreateStudentModal;
