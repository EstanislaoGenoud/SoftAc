import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getCourseById } from "@/modules/cursos";
import { getStudentsByCourse } from "@/modules/alumnos";
import { PlusIcon, TaskIcon, CrossIcon } from "@/shared/components/Icon";
import {
  getTareasByCurso,
  getEntregasByTarea,
  summarizeEntregas,
  getTrabajosNoEntregados,
  saveEntrega
} from "../services/tareaService";
import TaskCard from "../components/TaskCard";
import CreateTaskModal from "../components/CreateTaskModal";
import UnsubmittedTasksList from "../components/UnsubmittedTasksList";
import "../styles/Tasks.css";

export function Tasks() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [students, setStudents] = useState([]);
  const [entregasByTaskId, setEntregasByTaskId] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState("");
  const [activeTab, setActiveTab] = useState("TODAS"); // 'TODAS' | 'NO_ENTREGADOS'

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        setLoading(true);
        const [courseData, tareasData, studentsData] = await Promise.all([
          getCourseById(courseId).catch(() => null),
          getTareasByCurso(courseId),
          getStudentsByCourse(courseId).catch(() => [])
        ]);

        if (!active) return;
        setCourse(courseData);
        setTareas(tareasData);
        const validStudents = Array.isArray(studentsData) ? studentsData : [];
        setStudents(validStudents);

        const entries = await Promise.all(
          tareasData.map(async (t) => [t.id, await getEntregasByTarea(t.id)])
        );
        if (active) {
          setEntregasByTaskId(Object.fromEntries(entries));
        }
      } catch (err) {
        console.error("Error al cargar tareas del curso:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [courseId]);

  function handleTaskCreated(nuevaTarea) {
    setTareas((prev) => [nuevaTarea, ...prev.filter((t) => t.id !== nuevaTarea.id)]);
    setNotification("Tarea creada exitosamente.");
    setTimeout(() => setNotification(""), 4000);
  }

  const noEntregados = useMemo(() => {
    return getTrabajosNoEntregados(students, tareas, entregasByTaskId);
  }, [students, tareas, entregasByTaskId]);

  async function handleMarkDeliveredFromList(tareaId, alumnoId, nuevoEstado) {
    try {
      await saveEntrega({
        tareaId,
        alumnoId,
        estado: nuevoEstado
      });

      const updated = await getEntregasByTarea(tareaId);
      setEntregasByTaskId((prev) => ({
        ...prev,
        [tareaId]: updated
      }));
      setNotification("Entrega registrada correctamente.");
      setTimeout(() => setNotification(""), 3000);
    } catch (err) {
      alert(`Error al registrar entrega: ${err.message}`);
    }
  }

  const courseName = course?.nombre || course?.name || "Curso";

  if (loading) {
    return (
      <main className="tasks-page">
        <section className="tasks-card">
          <h1>Cargando tareas...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="tasks-page">
      <section className="tasks-card">
        <header className="tasks-header">
          <span className="tasks-kicker">
            <TaskIcon /> Gestión de Tareas · {courseName}
          </span>
          <h1>Tareas y Trabajos Prácticos</h1>
          <div className="tasks-summary">
            <p>
              Curso: <strong>{courseName}</strong>
            </p>
            <p>
              Total de tareas: <strong>{tareas.length}</strong>
            </p>
            <p>
              Alumnos: <strong>{students.length}</strong>
            </p>
            {noEntregados.length > 0 && (
              <p style={{ color: "var(--danger)", fontWeight: 700 }}>
                Trabajos adeudados: <strong>{noEntregados.length}</strong>
              </p>
            )}
          </div>
        </header>

        {notification && (
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
            {notification}
          </div>
        )}

        {/* Pestañas mobile-first: Todas las tareas vs No entregados */}
        <div className="deliveries-filter-group" style={{ marginTop: "18px" }} role="tablist">
          <button
            type="button"
            className={`filter-chip ${activeTab === "TODAS" ? "active" : ""}`}
            onClick={() => setActiveTab("TODAS")}
            role="tab"
            aria-selected={activeTab === "TODAS"}
          >
            <TaskIcon /> Todas las tareas ({tareas.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${activeTab === "NO_ENTREGADOS" ? "active" : ""}`}
            onClick={() => setActiveTab("NO_ENTREGADOS")}
            role="tab"
            aria-selected={activeTab === "NO_ENTREGADOS"}
            style={
              noEntregados.length > 0 && activeTab !== "NO_ENTREGADOS"
                ? { borderColor: "var(--danger)", color: "var(--danger)" }
                : {}
            }
          >
            <CrossIcon /> Trabajos no entregados ({noEntregados.length})
          </button>
        </div>

        {activeTab === "TODAS" && (
          <>
            <section className="tasks-toolbar">
              <div className="tasks-count-badge">
                <TaskIcon /> Listado de tareas ({tareas.length})
              </div>
              <button
                type="button"
                className="tasks-btn-create"
                onClick={() => setIsModalOpen(true)}
              >
                <PlusIcon /> Nueva tarea
              </button>
            </section>

            {tareas.length === 0 ? (
              <div className="tasks-empty-state">
                <h3>No hay tareas registradas todavía</h3>
                <p>Creá la primera tarea para que los alumnos puedan realizar sus entregas.</p>
                <button
                  type="button"
                  className="tasks-btn-create"
                  onClick={() => setIsModalOpen(true)}
                >
                  <PlusIcon /> Crear primera tarea
                </button>
              </div>
            ) : (
              <div className="tasks-list">
                {tareas.map((tarea) => {
                  const summary = summarizeEntregas(
                    tarea,
                    students,
                    entregasByTaskId[tarea.id] || {}
                  );
                  return (
                    <TaskCard
                      key={tarea.id}
                      tarea={tarea}
                      entregasSummary={summary}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "NO_ENTREGADOS" && (
          <UnsubmittedTasksList
            trabajosNoEntregados={noEntregados}
            onMarkDelivered={handleMarkDeliveredFromList}
          />
        )}
      </section>

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cursoId={courseId}
        cursoNombre={courseName}
        onTaskCreated={handleTaskCreated}
      />
    </main>
  );
}

export default Tasks;
