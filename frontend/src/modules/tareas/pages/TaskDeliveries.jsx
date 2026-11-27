import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getCourseById } from "@/modules/cursos";
import { getStudentsByCourse } from "@/modules/alumnos";
import {
  CheckIcon,
  CrossIcon,
  CalendarIcon,
  StudentIcon,
  TaskIcon
} from "@/shared/components/Icon";
import {
  getTareaById,
  getEntregasByTarea,
  saveEntrega,
  saveEntregasBatch,
  calcularEstadoEntrega,
  summarizeEntregas,
  formatFecha,
  isTareaVencida,
  ENTREGA_ESTADOS
} from "../services/tareaService";
import "../styles/Tasks.css";

export function TaskDeliveries() {
  const { courseId, taskId } = useParams();

  const [course, setCourse] = useState(null);
  const [tarea, setTarea] = useState(null);
  const [students, setStudents] = useState([]);
  const [entregas, setEntregas] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("TODOS");
  const [actionMessage, setActionMessage] = useState("");
  const [savingStudentId, setSavingStudentId] = useState(null);
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        setLoading(true);
        const [courseData, tareaData, studentsData, entregasData] =
          await Promise.all([
            getCourseById(courseId).catch(() => null),
            getTareaById(taskId),
            getStudentsByCourse(courseId).catch(() => []),
            getEntregasByTarea(taskId)
          ]);

        if (!active) return;
        setCourse(courseData);
        setTarea(tareaData);
        setStudents(Array.isArray(studentsData) ? studentsData : []);
        setEntregas(entregasData || {});
      } catch (err) {
        console.error("Error al cargar entregas de la tarea:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [courseId, taskId]);

  const summary = useMemo(() => {
    return summarizeEntregas(tarea, students, entregas);
  }, [tarea, students, entregas]);

  // Actualización optimista del estado de entrega
  async function handleUpdateState(alumnoId, nuevoEstado, observacion) {
    const aid = String(alumnoId);
    const anterior = entregas[aid];

    // Actualización inmediata en UI
    setSavingStudentId(aid);
    setEntregas((prev) => ({
      ...prev,
      [aid]: {
        ...prev[aid],
        tareaId: taskId,
        alumnoId: aid,
        estado: nuevoEstado,
        observacion:
          observacion !== undefined
            ? observacion
            : prev[aid]?.observacion || ""
      }
    }));

    try {
      const saved = await saveEntrega({
        tareaId: taskId,
        alumnoId: aid,
        estado: nuevoEstado,
        observacion:
          observacion !== undefined
            ? observacion
            : anterior?.observacion || ""
      });

      setEntregas((prev) => ({
        ...prev,
        [aid]: saved
      }));

      setActionMessage("Estado actualizado correctamente.");
      setTimeout(() => setActionMessage(""), 3000);
    } catch (err) {
      // Reversión optimista ante error
      setEntregas((prev) => ({
        ...prev,
        [aid]: anterior
      }));
      alert(`Error al actualizar entrega: ${err.message}`);
    } finally {
      setSavingStudentId(null);
    }
  }

  // Marcar todos los no completados como entregados
  async function handleMarkAllDelivered() {
    if (isBatchSaving) return;
    setIsBatchSaving(true);

    const pendientes = students.filter((s) => {
      const current = calcularEstadoEntrega(entregas[String(s.id)], tarea);
      return (
        current !== ENTREGA_ESTADOS.ENTREGADO &&
        current !== ENTREGA_ESTADOS.ENTREGADO_TARDE
      );
    });

    if (pendientes.length === 0) {
      setActionMessage("Todos los alumnos ya tienen registrada su entrega.");
      setTimeout(() => setActionMessage(""), 3000);
      setIsBatchSaving(false);
      return;
    }

    const registros = pendientes.map((s) => ({
      alumnoId: String(s.id),
      estado: isTareaVencida(tarea?.fechaEntrega)
        ? ENTREGA_ESTADOS.ENTREGADO_TARDE
        : ENTREGA_ESTADOS.ENTREGADO
    }));

    try {
      await saveEntregasBatch(taskId, registros);
      const updatedMap = await getEntregasByTarea(taskId);
      setEntregas(updatedMap);
      setActionMessage(
        `Se marcaron ${registros.length} entregas como completadas.`
      );
      setTimeout(() => setActionMessage(""), 3500);
    } catch (err) {
      alert(`Error al marcar entregas masivas: ${err.message}`);
    } finally {
      setIsBatchSaving(false);
    }
  }

  // Filtrado de alumnos para visualización
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const estado = calcularEstadoEntrega(
        entregas[String(student.id)],
        tarea
      );

      if (filter === "ENTREGADOS") {
        return (
          estado === ENTREGA_ESTADOS.ENTREGADO ||
          estado === ENTREGA_ESTADOS.ENTREGADO_TARDE
        );
      }
      if (filter === "PENDIENTES") {
        return estado === ENTREGA_ESTADOS.PENDIENTE;
      }
      if (filter === "NO_ENTREGADOS") {
        return estado === ENTREGA_ESTADOS.NO_ENTREGADO;
      }
      return true;
    });
  }, [students, entregas, tarea, filter]);

  if (loading) {
    return (
      <main className="tasks-page">
        <section className="tasks-card">
          <h1>Cargando entregas...</h1>
        </section>
      </main>
    );
  }

  if (!tarea) {
    return (
      <main className="tasks-page">
        <section className="tasks-card">
          <header className="tasks-header">
            <h1>Tarea no encontrada</h1>
          </header>
        </section>
      </main>
    );
  }

  const courseName = course?.nombre || course?.name || "Curso";
  const vencida = isTareaVencida(tarea.fechaEntrega);

  return (
    <main className="tasks-page">
      <section className="tasks-card">
        <header className="tasks-header">
          <span className="tasks-kicker">
            <TaskIcon /> {courseName} · Entregas
          </span>
          <h1>{tarea.titulo}</h1>

          {tarea.descripcion && (
            <p className="task-deliveries-desc">{tarea.descripcion}</p>
          )}

          <div className="task-card-footer" style={{ marginTop: "12px" }}>
            <span className="task-card-date">
              <CalendarIcon /> Fecha de entrega:{" "}
              <strong>{formatFecha(tarea.fechaEntrega)}</strong>
            </span>
            <span
              className={`task-badge ${vencida ? "task-badge-vencida" : "task-badge-vigente"}`}
              role="status"
            >
              {vencida ? "Vencida" : "Vigente"}
            </span>
          </div>
        </header>

        {/* Resumen de entregas */}
        <section className="task-overview-grid" aria-label="Métricas de entrega">
          <div className="task-overview-card">
            <span className="overview-value">{summary.total}</span>
            <span className="overview-label">Total alumnos</span>
          </div>
          <div className="task-overview-card overview-success">
            <span className="overview-value">{summary.entregados}</span>
            <span className="overview-label">
              Entregados ({summary.porcentajeCumplimiento}%)
            </span>
          </div>
          <div className="task-overview-card overview-warning">
            <span className="overview-value">{summary.pendientes}</span>
            <span className="overview-label">Pendientes</span>
          </div>
          <div className="task-overview-card overview-danger">
            <span className="overview-value">{summary.noEntregados}</span>
            <span className="overview-label">No entregados</span>
          </div>
        </section>

        {actionMessage && (
          <div
            style={{
              marginTop: "16px",
              padding: "10px 14px",
              background: "var(--accent-light)",
              color: "var(--accent)",
              border: "1px solid var(--accent-border)",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.95rem"
            }}
            role="status"
          >
            {actionMessage}
          </div>
        )}

        {/* Filtros rápidos y acciones masivas */}
        <section className="deliveries-toolbar">
          <div className="deliveries-filter-group" role="tablist">
            <button
              type="button"
              className={`filter-chip ${filter === "TODOS" ? "active" : ""}`}
              onClick={() => setFilter("TODOS")}
              role="tab"
              aria-selected={filter === "TODOS"}
            >
              Todos ({summary.total})
            </button>
            <button
              type="button"
              className={`filter-chip ${filter === "ENTREGADOS" ? "active" : ""}`}
              onClick={() => setFilter("ENTREGADOS")}
              role="tab"
              aria-selected={filter === "ENTREGADOS"}
            >
              Entregados ({summary.entregados})
            </button>
            <button
              type="button"
              className={`filter-chip ${filter === "PENDIENTES" ? "active" : ""}`}
              onClick={() => setFilter("PENDIENTES")}
              role="tab"
              aria-selected={filter === "PENDIENTES"}
            >
              Pendientes ({summary.pendientes})
            </button>
            <button
              type="button"
              className={`filter-chip ${filter === "NO_ENTREGADOS" ? "active" : ""}`}
              onClick={() => setFilter("NO_ENTREGADOS")}
              role="tab"
              aria-selected={filter === "NO_ENTREGADOS"}
            >
              No entregados ({summary.noEntregados})
            </button>
          </div>

          <button
            type="button"
            className="btn-mark-all"
            onClick={handleMarkAllDelivered}
            disabled={isBatchSaving || summary.pendientes + summary.noEntregados === 0}
            title="Marcar todos los alumnos pendientes como entregados"
          >
            <CheckIcon /> {isBatchSaving ? "Guardando..." : "Marcar todos entregados"}
          </button>
        </section>

        {/* Listado de alumnos y controles de entrega */}
        <section className="deliveries-student-list" aria-label="Listado de alumnos">
          {filteredStudents.length === 0 ? (
            <div className="tasks-empty-state">
              <p>No se encontraron alumnos para este filtro.</p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const sid = String(student.id ?? student.alumnoId);
              const entrega = entregas[sid];
              const estado = calcularEstadoEntrega(entrega, tarea);
              const isSaving = savingStudentId === sid;
              const fullName =
                `${student.nombre || ""} ${student.apellido || ""}`.trim() ||
                student.name ||
                "Alumno";
              const dni = student.identificacion || student.dni || "Sin DNI";
              const isDelivered =
                estado === ENTREGA_ESTADOS.ENTREGADO ||
                estado === ENTREGA_ESTADOS.ENTREGADO_TARDE;

              return (
                <article
                  key={sid}
                  className={`delivery-student-card delivery-status-${estado.toLowerCase()}`}
                >
                  <div className="delivery-student-info">
                    <div className="delivery-student-title">
                      <StudentIcon />
                      <h3>{fullName}</h3>
                    </div>
                    <p className="delivery-student-dni">DNI: {dni}</p>

                    {entrega?.fechaEntregaReal && (
                      <p className="delivery-student-date">
                        Entregado el: {formatFecha(entrega.fechaEntregaReal)}
                      </p>
                    )}

                    {entrega?.observacion && (
                      <p className="delivery-student-obs">
                        Nota: {entrega.observacion}
                      </p>
                    )}
                  </div>

                  <div className="delivery-student-controls">
                    {/* Badge de estado accesible con texto e ícono */}
                    <span
                      className={`delivery-badge badge-${estado.toLowerCase()}`}
                      role="status"
                    >
                      {estado === ENTREGA_ESTADOS.ENTREGADO && (
                        <>
                          <CheckIcon /> Entregado
                        </>
                      )}
                      {estado === ENTREGA_ESTADOS.ENTREGADO_TARDE && (
                        <>
                          <CheckIcon /> Entregado tarde
                        </>
                      )}
                      {estado === ENTREGA_ESTADOS.NO_ENTREGADO && (
                        <>
                          <CrossIcon /> No entregado
                        </>
                      )}
                      {estado === ENTREGA_ESTADOS.PENDIENTE && "Pendiente"}
                    </span>

                    {/* Botón rápido toggle */}
                    <button
                      type="button"
                      className={`btn-quick-toggle ${isDelivered ? "delivered" : ""}`}
                      onClick={() =>
                        handleUpdateState(
                          sid,
                          isDelivered
                            ? ENTREGA_ESTADOS.PENDIENTE
                            : vencida
                            ? ENTREGA_ESTADOS.ENTREGADO_TARDE
                            : ENTREGA_ESTADOS.ENTREGADO
                        )
                      }
                      disabled={isSaving}
                      aria-label={
                        isDelivered
                          ? `Desmarcar entrega para ${fullName}`
                          : `Marcar entregado para ${fullName}`
                      }
                    >
                      <CheckIcon />
                      {isDelivered ? "Entregado" : "Marcar"}
                    </button>

                    {/* Selector de estado explícito */}
                    <label className="delivery-state-label">
                      <span className="sr-only">Modificar estado de entrega</span>
                      <select
                        className="delivery-state-select"
                        value={estado}
                        onChange={(e) => handleUpdateState(sid, e.target.value)}
                        disabled={isSaving}
                        aria-label={`Cambiar estado de entrega de ${fullName}`}
                      >
                        <option value={ENTREGA_ESTADOS.ENTREGADO}>
                          Entregado a tiempo
                        </option>
                        <option value={ENTREGA_ESTADOS.ENTREGADO_TARDE}>
                          Entregado tarde
                        </option>
                        <option value={ENTREGA_ESTADOS.NO_ENTREGADO}>
                          No entregado
                        </option>
                        <option value={ENTREGA_ESTADOS.PENDIENTE}>
                          Pendiente
                        </option>
                      </select>
                    </label>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </section>
    </main>
  );
}

export default TaskDeliveries;
