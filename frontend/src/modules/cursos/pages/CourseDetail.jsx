import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourseById } from "../services/courseService";
import { getUltimaClase } from "@/modules/asistencias";
import { getClasesByCursoMateria } from "@/modules/asistencias/services/clasesService";
import {
  calculateAttendancePercentage,
  getAttendance,
  getAttendancePercentagesByCourse
} from "@/modules/asistencias/services/attendanceService";
import { getStudentsByCourse, CreateStudentModal } from "@/modules/alumnos";
import {
  getEvaluacionesByCurso,
  getCalificacionesByEvaluacion,
  calculateStudentAverage,
  getRecoveryConfigMock,
  getGradingConfigMock
} from "@/modules/evaluaciones/services/evaluacionMockService";
import {
  getTrabajosNoEntregadosByCurso,
  saveEntrega
} from "@/modules/tareas";
import {
  detectCourseAlerts,
  calculateCourseAcademicAverage
} from "../services/dashboardMetrics";
import CourseAlertsSection from "../components/CourseAlertsSection";
import CourseMetricsGrid from "../components/CourseMetricsGrid";
import { UnsubmittedTasksList } from "@/modules/tareas";
import {
  StudentIcon,
  CheckIcon,
  CourseIcon,
  PlusIcon,
  TaskIcon,
  CrossIcon
} from "@/shared/components/Icon";
import "../styles/CourseDetail.css";

function CourseDetail() {
  const { id, courseId } = useParams();
  const navigate = useNavigate();

  // Estados del curso y carga
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Alumnos
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  // Asistencia
  const [attendancePercentage, setAttendancePercentage] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);

  // Calificaciones
  const [academicAverage, setAcademicAverage] = useState(null);
  const [studentAverages, setStudentAverages] = useState([]);

  // Tareas y Trabajos No Entregados (#329)
  const [unsubmittedTasks, setUnsubmittedTasks] = useState([]);

  // Última clase
  const [ultimaClase, setUltimaClase] = useState(null);

  // Alertas
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let active = true;

    async function fetchDashboardData() {
      setLoading(true);

      // 1. Cargar datos del curso
      try {
        const courseData = await getCourseById(courseId);
        if (active) setCourse(courseData);
      } catch (err) {
        console.warn("Aviso API Curso:", err.message);
      }

      // 2. Cargar alumnos del curso
      let loadedStudents = [];
      try {
        setLoadingStudents(true);
        const data = await getStudentsByCourse(courseId);
        loadedStudents = Array.isArray(data) ? data : [];
        if (active) setStudents(loadedStudents);
      } catch (err) {
        console.warn("Aviso API Alumnos:", err.message);
      } finally {
        if (active) setLoadingStudents(false);
      }

      // 3. Cargar última clase de forma independiente
      try {
        const claseData = await getUltimaClase(courseId);
        if (active) setUltimaClase(claseData);
      } catch (err) {
        console.warn("Aviso API Clases:", err.message);
      }

      // 4. Cargar asistencia del curso de forma resiliente
      let attPerc = null;
      let attList = [];
      try {
        // Intentar endpoint de cálculo backend
        const backendPercentages = await getAttendancePercentagesByCourse(courseId).catch(() => null);
        if (Array.isArray(backendPercentages) && backendPercentages.length > 0) {
          attList = backendPercentages;
          const sum = backendPercentages.reduce((acc, curr) => acc + (curr.porcentaje || 0), 0);
          attPerc = Math.round(sum / backendPercentages.length);
        } else {
          // Fallback al cálculo acumulativo de clases locales
          const classes = await getClasesByCursoMateria(courseId).catch(() => []);
          const records = [];
          for (const currentClass of classes) {
            const attendance = await getAttendance(currentClass.id).catch(() => ({}));
            records.push(...Object.values(attendance));
          }
          attPerc = calculateAttendancePercentage(records);
        }
        if (active) {
          setAttendancePercentage(attPerc);
          setAttendanceList(attList);
        }
      } catch (err) {
        console.warn("Aviso cálculo asistencia:", err.message);
      }

      // 5. Cargar calificaciones y calcular promedio académico general
      let avgList = [];
      try {
        const evaluations = await getEvaluacionesByCurso(courseId).catch(() => []);
        if (evaluations.length > 0 && loadedStudents.length > 0) {
          const gradingConfig = getGradingConfigMock();
          const recoveryConfig = getRecoveryConfigMock(courseId);

          const gradeEntries = await Promise.all(
            evaluations.map(async (ev) => [ev.id, await getCalificacionesByEvaluacion(ev.id).catch(() => ({}))])
          );
          const gradesByEval = Object.fromEntries(gradeEntries);

          avgList = loadedStudents.map((st) => {
            const res = calculateStudentAverage(
              st.id,
              evaluations,
              gradesByEval,
              recoveryConfig?.modo,
              gradingConfig?.modelo
            );
            return {
              studentId: String(st.id),
              average: res.average
            };
          });

          const courseAvg = calculateCourseAcademicAverage(avgList);
          if (active) {
            setAcademicAverage(courseAvg);
            setStudentAverages(avgList);
          }
        }
      } catch (err) {
        console.warn("Aviso evaluaciones:", err.message);
      }

      // 6. Cargar trabajos no entregados (#329)
      let unsubmitted = [];
      try {
        unsubmitted = await getTrabajosNoEntregadosByCurso(courseId, loadedStudents);
        if (active) setUnsubmittedTasks(unsubmitted);
      } catch (err) {
        console.warn("Aviso trabajos no entregados:", err.message);
      }

      // 7. Detección consolidada de alertas (#337)
      try {
        const detectedAlerts = detectCourseAlerts({
          students: loadedStudents,
          attendancePercentages: attList,
          studentAverages: avgList,
          trabajosNoEntregados: unsubmitted,
          attendanceThreshold: 75,
          gradeThreshold: 6
        });
        if (active) setAlerts(detectedAlerts);
      } catch (err) {
        console.warn("Aviso detección de alertas:", err.message);
      }

      if (active) setLoading(false);
    }

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, [courseId]);

  function handleStudentEnrolled(newStudent) {
    setStudents((prev) => [newStudent, ...prev]);
    setCourse((prev) =>
      prev
        ? {
            ...prev,
            cantidad_alumnos:
              (prev.cantidad_alumnos !== undefined ? prev.cantidad_alumnos : students.length) + 1
          }
        : prev
    );
  }

  // Marcar trabajo entregado directamente desde la vista del dashboard (#329)
  async function handleMarkDeliveredFromDashboard(tareaId, alumnoId, nuevoEstado) {
    try {
      await saveEntrega({
        tareaId,
        alumnoId,
        estado: nuevoEstado
      });
      // Recalcular lista de no entregados
      const updated = await getTrabajosNoEntregadosByCurso(courseId, students);
      setUnsubmittedTasks(updated);

      // Recalcular alertas
      const updatedAlerts = detectCourseAlerts({
        students,
        attendancePercentages: attendanceList,
        studentAverages,
        trabajosNoEntregados: updated
      });
      setAlerts(updatedAlerts);
    } catch (err) {
      alert(`Error al registrar entrega: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <main className="course-detail-page">
        <h1>Cargando resumen del curso...</h1>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="course-detail-page">
        <section className="course-detail-card">
          <header className="course-detail-header">
            <span className="course-detail-kicker">Curso</span>
            <h1>Curso no encontrado</h1>
          </header>
        </section>
      </main>
    );
  }

  const studentCount =
    students.length > 0
      ? students.length
      : course.cantidad_alumnos !== undefined
      ? course.cantidad_alumnos
      : 0;

  return (
    <main className="course-detail-page">
      <section className="course-detail-card">
        {/* Encabezado del Curso */}
        <header className="course-detail-header">
          <span className="course-detail-kicker">
            Panel Ejecutivo · {course.escuela ? course.escuela.nombre : "Escuela"}
          </span>
          <h1>{course.nombre || course.name}</h1>
          <p style={{ color: "var(--text)", fontSize: "0.95rem", margin: "4px 0 0" }}>
            Resumen visual y métricas integrales de desempeño
          </p>
        </header>

        {/* 1. SECCIÓN DE ALERTAS (#337 HU-31) - Prioridad visual en pantallas chicas */}
        <CourseAlertsSection alerts={alerts} />

        {/* 2. TARJETAS DE MÉTRICAS DEL CURSO (#337 HU-31) */}
        <CourseMetricsGrid
          attendancePercentage={attendancePercentage}
          academicAverage={academicAverage}
          studentCount={studentCount}
          unsubmittedCount={unsubmittedTasks.length}
          ultimaClase={ultimaClase}
        />

        {/* 3. OPCIONES DE GESTIÓN RÁPIDA */}
        <section className="course-detail-management" aria-label="Módulos de gestión">
          <h2>Gestión académica</h2>
          <div className="course-management-options">
            <button
              type="button"
              className="course-management-option"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/alumnos`)}
            >
              <span>
                <StudentIcon /> Alumnos
              </span>
              <small>Listado y ficha integral de alumnos</small>
            </button>

            <button
              type="button"
              className="course-management-option"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/asistencia`)}
            >
              <span>
                <CheckIcon /> Asistencia
              </span>
              <small>Pasar y consultar asistencia</small>
            </button>

            <button
              type="button"
              className="course-management-option"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/evaluaciones`)}
            >
              <span>
                <CourseIcon /> Evaluaciones y Notas
              </span>
              <small>Cargar exámenes y promedios</small>
            </button>

            <button
              type="button"
              className="course-management-option"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/tareas`)}
            >
              <span>
                <TaskIcon /> Tareas y Trabajos
              </span>
              <small>
                {unsubmittedTasks.length > 0
                  ? `${unsubmittedTasks.length} adeudados`
                  : "Crear tareas y entregas"}
              </small>
            </button>
          </div>
        </section>

        {/* 4. TRABAJOS NO ENTREGADOS (#329 HU-30) - Integrado en el Dashboard */}
        {unsubmittedTasks.length > 0 && (
          <section
            style={{ marginTop: "28px" }}
            aria-labelledby="unsubmitted-dashboard-heading"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px"
              }}
            >
              <h2 id="unsubmitted-dashboard-heading" style={{ margin: 0 }}>
                <CrossIcon /> Trabajos adeudados ({unsubmittedTasks.length})
              </h2>
              <button
                type="button"
                className="last-class-link-action"
                onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/tareas`)}
              >
                Ver todas las tareas &rarr;
              </button>
            </div>
            <UnsubmittedTasksList
              trabajosNoEntregados={unsubmittedTasks}
              onMarkDelivered={handleMarkDeliveredFromDashboard}
              compact={true}
            />
          </section>
        )}

        {/* 5. VISTA PREVIA DE ALUMNOS INSCRIPTOS */}
        <section
          className="course-students-section"
          aria-labelledby="course-students-heading"
          style={{ marginTop: "28px" }}
        >
          <div className="course-students-header">
            <h2 id="course-students-heading">
              <StudentIcon /> Alumnos ({studentCount})
            </h2>
            <div className="course-students-actions">
              <button
                type="button"
                className="btn-enroll-inline"
                onClick={() => setIsEnrollModalOpen(true)}
              >
                <PlusIcon /> Inscribir alumno
              </button>
              {students.length > 0 && (
                <button
                  type="button"
                  className="course-students-link-action"
                  onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/alumnos`)}
                >
                  Ver todos &rarr;
                </button>
              )}
            </div>
          </div>

          {loadingStudents ? (
            <p className="last-class-hint">Cargando alumnos del curso...</p>
          ) : students.length === 0 ? (
            <div className="last-class-empty-box">
              <p>No hay alumnos inscriptos en este curso todavía.</p>
              <button
                type="button"
                className="btn-create-first-class"
                onClick={() => setIsEnrollModalOpen(true)}
              >
                <PlusIcon /> Inscribir primer alumno
              </button>
            </div>
          ) : (
            <div className="course-students-preview-list">
              {students.slice(0, 5).map((student) => {
                const fullName =
                  `${student.nombre || ""} ${student.apellido || ""}`.trim() ||
                  student.name ||
                  "Alumno";
                const dni = student.identificacion || student.dni || "Sin DNI";
                return (
                  <div
                    key={student.id}
                    className="course-student-preview-item"
                    onClick={() =>
                      navigate(
                        `/escuelas/${id}/cursos/${courseId}/alumnos/${student.id}`
                      )
                    }
                  >
                    <div>
                      <h4>{fullName}</h4>
                      <p>DNI: {dni} · Estado: {student.estado || "REGULAR"}</p>
                    </div>
                    <span className="course-student-arrow">&rarr;</span>
                  </div>
                );
              })}
              {students.length > 5 && (
                <button
                  type="button"
                  className="last-class-link-action"
                  style={{ alignSelf: "flex-start", marginTop: "6px" }}
                  onClick={() =>
                    navigate(`/escuelas/${id}/cursos/${courseId}/alumnos`)
                  }
                >
                  Ver los {students.length - 5} alumnos restantes &rarr;
                </button>
              )}
            </div>
          )}
        </section>
      </section>

      <CreateStudentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        cursoId={courseId}
        cursoNombre={course?.nombre || course?.name}
        onStudentEnrolled={handleStudentEnrolled}
      />
    </main>
  );
}

export default CourseDetail;
