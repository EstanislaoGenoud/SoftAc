import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStudentProfile, getStudentHistory } from "../services/studentService";
import { getCourseById } from "@/modules/cursos";
import { getClasesByCursoMateria } from "@/modules/asistencias/services/clasesService";
import {
  calculateAttendancePercentage,
  getAttendance,
  summarizeAttendance,
  ATTENDANCE_STATES
} from "@/modules/asistencias/services/attendanceService";
import { getResumenAcademicoCurso } from "@/modules/evaluaciones/services/evaluacionService";
import {
  getTareasByCurso,
  getEntregasByTarea,
  calcularEstadoEntrega,
  formatFecha,
  ENTREGA_ESTADOS
} from "@/modules/tareas";
import StudentVisualSummary from "../components/StudentVisualSummary";
import {
  StudentIcon,
  CheckIcon,
  CrossIcon,
  CourseIcon,
  TaskIcon
} from "@/shared/components/Icon";
import "@/modules/cursos/styles/CourseDetail.css";
import "../styles/Students.css";

function StudentProfile() {
  const { id, courseId, studentId } = useParams();
  const navigate = useNavigate();

  // Estados de datos
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Asistencia
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  // Evaluaciones y Calificaciones
  const [evaluationsWithGrades, setEvaluationsWithGrades] = useState([]);
  const [academicAverage, setAcademicAverage] = useState(null);

  // Tareas y Entregas
  const [studentTasks, setStudentTasks] = useState([]);
  const [taskSummary, setTaskSummary] = useState({
    total: 0,
    entregados: 0,
    noEntregados: 0,
    pendientes: 0,
    porcentajeCumplimiento: 100
  });

  // Observaciones pedagógicas consolidadas
  const [allObservations, setAllObservations] = useState([]);

  useEffect(() => {
    let active = true;

    async function fetchIntegralAcademicData() {
      try {
        setLoading(true);

        // 1. Datos personales, historial de inscripciones y datos del curso
        const [profileData, historyData, courseData] = await Promise.all([
          getStudentProfile(studentId).catch(() => null),
          getStudentHistory(studentId).catch(() => []),
          getCourseById(courseId).catch(() => null)
        ]);

        if (!active) return;
        setProfile(profileData);
        setHistory(Array.isArray(historyData) ? historyData : []);
        setCourse(courseData);

        // 2. Asistencias detalladas y resumen
        const classes = await getClasesByCursoMateria(courseId).catch(() => []);
        const rawRecords = [];
        const classAttendanceList = [];
        const observationsList = [];

        for (const currentClass of classes) {
          const attendance = await getAttendance(currentClass.id).catch(() => ({}));
          const record = attendance[studentId] || attendance[String(studentId)];
          if (record) {
            rawRecords.push(record);
            classAttendanceList.push({
              claseId: currentClass.id,
              fecha: currentClass.fecha,
              tema: currentClass.tema,
              estado: record.estado,
              observacion: record.observacion
            });
            if (record.observacion) {
              observationsList.push({
                origen: "Asistencia",
                fecha: currentClass.fecha,
                texto: record.observacion,
                detalle: `Clase: ${currentClass.tema || "Tema no especificado"}`
              });
            }
          }
        }

        const attSummary = summarizeAttendance(rawRecords);
        const attPerc = calculateAttendancePercentage(rawRecords);

        if (active) {
          setAttendanceSummary({ ...attSummary, porcentaje: attPerc });
          setAttendanceHistory(classAttendanceList);
        }

        // 3. Evaluaciones y Promedios (#350)
        try {
          const { evaluations, gradesByEvaluation: gradesByEval, averages } =
            await getResumenAcademicoCurso(courseId, [studentId]);
          if (evaluations.length > 0) {
            const avgResult = averages[0];

            const evWithGrades = evaluations.map((ev) => {
              const rawGrade = gradesByEval[ev.id]?.[studentId];
              return {
                ...ev,
                nota: rawGrade !== undefined && rawGrade !== null ? rawGrade : null
              };
            });

            if (active) {
              setAcademicAverage(avgResult.average);
              setEvaluationsWithGrades(evWithGrades);
            }
          }
        } catch (err) {
          console.warn("Aviso calificaciones del alumno:", err.message);
        }

        // 4. Tareas y Entregas del Alumno (#350)
        try {
          const tareas = await getTareasByCurso(courseId).catch(() => []);
          const tasksDetails = [];
          let entregados = 0;
          let noEntregados = 0;
          let pendientes = 0;

          for (const t of tareas) {
            const entregasMap = await getEntregasByTarea(t.id).catch(() => ({}));
            const entrega = entregasMap[String(studentId)];
            const estado = calcularEstadoEntrega(entrega, t);

            if (
              estado === ENTREGA_ESTADOS.ENTREGADO ||
              estado === ENTREGA_ESTADOS.ENTREGADO_TARDE
            ) {
              entregados++;
            } else if (estado === ENTREGA_ESTADOS.NO_ENTREGADO) {
              noEntregados++;
            } else {
              pendientes++;
            }

            tasksDetails.push({
              tareaId: t.id,
              titulo: t.titulo,
              descripcion: t.descripcion,
              fechaEntrega: t.fechaEntrega,
              estado,
              fechaEntregaReal: entrega?.fechaEntregaReal,
              observacion: entrega?.observacion
            });

            if (entrega?.observacion) {
              observationsList.push({
                origen: "Tarea",
                fecha: entrega.fechaEntregaReal || t.fechaEntrega,
                texto: entrega.observacion,
                detalle: `Tarea: ${t.titulo}`
              });
            }
          }

          const totalTasks = tareas.length;
          const taskRatio =
            totalTasks > 0 ? Math.round((entregados / totalTasks) * 100) : 100;

          if (active) {
            setStudentTasks(tasksDetails);
            setTaskSummary({
              total: totalTasks,
              entregados,
              noEntregados,
              pendientes,
              porcentajeCumplimiento: taskRatio
            });
          }
        } catch (err) {
          console.warn("Aviso tareas del alumno:", err.message);
        }

        // 5. Consolidación de observaciones del perfil + clases + tareas
        if (profileData?.observaciones && Array.isArray(profileData.observaciones)) {
          for (const obs of profileData.observaciones) {
            observationsList.push({
              origen: "Docente",
              fecha: obs.fecha || "-",
              texto: obs.texto || obs.nota,
              detalle: obs.autor ? `Por ${obs.autor}` : ""
            });
          }
        }

        if (active) {
          setAllObservations(observationsList);
        }
      } catch (error) {
        console.error("Error al cargar ficha integral del alumno:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchIntegralAcademicData();

    return () => {
      active = false;
    };
  }, [studentId, courseId]);

  if (loading) {
    return (
      <main className="course-detail-page">
        <h1>Cargando ficha académica integral...</h1>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="course-detail-page">
        <section className="course-detail-card">
          <header className="course-detail-header">
            <h1>Alumno no encontrado</h1>
          </header>
        </section>
      </main>
    );
  }

  const fullName = `${profile.nombre || ""} ${profile.apellido || ""}`.trim() || "Alumno";
  const courseName = course?.nombre || course?.name || "Curso actual";
  const dni = profile.identificacion || profile.dni || "No registrado";

  return (
    <main className="course-detail-page">
      <section className="course-detail-card">
        {/* Encabezado */}
        <header className="course-detail-header">
          <span className="course-detail-kicker">
            <StudentIcon /> Ficha Académica Integral · {courseName}
          </span>
          <h1>{fullName}</h1>
          <div className="course-detail-summary">
            <p>
              DNI: <strong>{dni}</strong>
            </p>
            <p>
              Curso: <strong>{courseName}</strong>
            </p>
            <p>
              Estado: <strong>{profile.estado || "REGULAR"}</strong>
            </p>
          </div>
        </header>

        {/* 1. RESUMEN VISUAL EJECUTIVO (#350 HU-32) - Barras de progreso e indicador de riesgo */}
        <StudentVisualSummary
          attendancePercentage={attendanceSummary?.porcentaje}
          academicAverage={academicAverage}
          taskSummary={taskSummary}
          studentName={fullName}
        />

        <section className="course-detail-management">
          {/* 2. CALIFICACIONES Y EVALUACIONES (#350 HU-32) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "24px"
            }}
          >
            <h2 style={{ margin: 0 }}>
              <CourseIcon /> Calificaciones y Evaluaciones
            </h2>
            <button
              type="button"
              className="last-class-link-action"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/evaluaciones`)}
            >
              Ver evaluaciones &rarr;
            </button>
          </div>

          <div
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "12px 14px",
              margin: "10px 0 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ fontWeight: 600, color: "var(--text-h)" }}>
              Promedio ponderado del ciclo:
            </span>
            <strong
              style={{
                fontSize: "1.3rem",
                color:
                  academicAverage === null
                    ? "var(--text)"
                    : academicAverage >= 7
                    ? "var(--accent)"
                    : academicAverage >= 6
                    ? "#d97706"
                    : "var(--danger)"
              }}
            >
              {academicAverage !== null ? academicAverage : "Sin notas"}
            </strong>
          </div>

          {evaluationsWithGrades.length === 0 ? (
            <p style={{ color: "var(--text)", fontSize: "0.9rem" }}>
              No hay evaluaciones registradas para este curso todavía.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {evaluationsWithGrades.map((ev) => (
                <li
                  key={ev.id}
                  style={{
                    background: "var(--surface)",
                    padding: "10px 14px",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    marginBottom: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--text-h)", fontSize: "0.95rem" }}>
                      {ev.nombre || ev.titulo}
                    </strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--text)", marginTop: "2px" }}>
                      {ev.tipo || "Evaluación"} · Ponderación: {ev.ponderacion || 0}% · Fecha:{" "}
                      {formatFecha(ev.fecha)}
                    </div>
                  </div>
                  <div>
                    {ev.nota !== null ? (
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 800,
                          padding: "4px 10px",
                          borderRadius: "8px",
                          background:
                            Number(ev.nota) >= 7
                              ? "var(--accent-light)"
                              : Number(ev.nota) >= 6
                              ? "#fef3c7"
                              : "rgba(200, 76, 85, 0.12)",
                          color:
                            Number(ev.nota) >= 7
                              ? "var(--accent)"
                              : Number(ev.nota) >= 6
                              ? "#b45309"
                              : "var(--danger)"
                        }}
                      >
                        {ev.nota}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "var(--text)", fontStyle: "italic" }}>
                        Sin calificar
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* 3. TAREAS Y TRABAJOS PRÁCTICOS (#350 HU-32) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "24px"
            }}
          >
            <h2 style={{ margin: 0 }}>
              <TaskIcon /> Tareas y Trabajos Prácticos
            </h2>
            <button
              type="button"
              className="last-class-link-action"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/tareas`)}
            >
              Ir a tareas &rarr;
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              margin: "10px 0 14px"
            }}
          >
            <div
              style={{
                flex: "1 1 120px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                padding: "8px 12px",
                borderRadius: "8px",
                textAlign: "center"
              }}
            >
              <strong style={{ color: "var(--accent)", fontSize: "1.1rem" }}>
                {taskSummary.entregados}
              </strong>
              <small style={{ display: "block", color: "var(--text)", fontSize: "0.75rem" }}>
                Entregadas
              </small>
            </div>
            <div
              style={{
                flex: "1 1 120px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                padding: "8px 12px",
                borderRadius: "8px",
                textAlign: "center"
              }}
            >
              <strong style={{ color: "var(--danger)", fontSize: "1.1rem" }}>
                {taskSummary.noEntregados}
              </strong>
              <small style={{ display: "block", color: "var(--text)", fontSize: "0.75rem" }}>
                No entregadas
              </small>
            </div>
            <div
              style={{
                flex: "1 1 120px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                padding: "8px 12px",
                borderRadius: "8px",
                textAlign: "center"
              }}
            >
              <strong style={{ color: "#d97706", fontSize: "1.1rem" }}>
                {taskSummary.pendientes}
              </strong>
              <small style={{ display: "block", color: "var(--text)", fontSize: "0.75rem" }}>
                Pendientes
              </small>
            </div>
          </div>

          {studentTasks.length === 0 ? (
            <p style={{ color: "var(--text)", fontSize: "0.9rem" }}>
              No hay tareas asignadas en este curso todavía.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {studentTasks.map((stTask) => (
                <li
                  key={stTask.tareaId}
                  style={{
                    background: "var(--surface)",
                    padding: "10px 14px",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    marginBottom: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--text-h)", fontSize: "0.95rem" }}>
                      {stTask.titulo}
                    </strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--text)", marginTop: "2px" }}>
                      Fecha límite: {formatFecha(stTask.fechaEntrega)}
                      {stTask.fechaEntregaReal && (
                        <span> · Entregado: {formatFecha(stTask.fechaEntregaReal)}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span
                      className={`delivery-badge badge-${stTask.estado.toLowerCase()}`}
                      style={{ fontSize: "0.75rem" }}
                    >
                      {stTask.estado === ENTREGA_ESTADOS.ENTREGADO && (
                        <>
                          <CheckIcon /> Entregado
                        </>
                      )}
                      {stTask.estado === ENTREGA_ESTADOS.ENTREGADO_TARDE && (
                        <>
                          <CheckIcon /> Entregado tarde
                        </>
                      )}
                      {stTask.estado === ENTREGA_ESTADOS.NO_ENTREGADO && (
                        <>
                          <CrossIcon /> No entregado
                        </>
                      )}
                      {stTask.estado === ENTREGA_ESTADOS.PENDIENTE && "Pendiente"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* 4. ASISTENCIAS DETALLADAS (#350 HU-32) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "24px"
            }}
          >
            <h2 style={{ margin: 0 }}>
              <CheckIcon /> Detalle de Asistencias
            </h2>
            <button
              type="button"
              className="last-class-link-action"
              onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/asistencia`)}
            >
              Ir a asistencias &rarr;
            </button>
          </div>

          {attendanceSummary && attendanceSummary.total > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: "10px",
                margin: "10px 0 14px"
              }}
            >
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  textAlign: "center"
                }}
              >
                <strong style={{ fontSize: "1.3rem", color: "var(--accent)" }}>
                  {attendanceSummary.porcentaje}%
                </strong>
                <p style={{ fontSize: "0.8rem", color: "var(--text)", marginTop: "4px" }}>
                  Porcentaje
                </p>
              </div>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  textAlign: "center"
                }}
              >
                <strong style={{ fontSize: "1.3rem", color: "var(--text-h)" }}>
                  {attendanceSummary.PRESENTE}
                </strong>
                <p style={{ fontSize: "0.8rem", color: "var(--text)", marginTop: "4px" }}>
                  Presentes
                </p>
              </div>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  textAlign: "center"
                }}
              >
                <strong style={{ fontSize: "1.3rem", color: "var(--danger)" }}>
                  {attendanceSummary.AUSENTE}
                </strong>
                <p style={{ fontSize: "0.8rem", color: "var(--text)", marginTop: "4px" }}>
                  Ausencias
                </p>
              </div>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  textAlign: "center"
                }}
              >
                <strong style={{ fontSize: "1.3rem", color: "#d97706" }}>
                  {attendanceSummary.MEDIA_FALTA || 0}
                </strong>
                <p style={{ fontSize: "0.8rem", color: "var(--text)", marginTop: "4px" }}>
                  Medias faltas
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "var(--bg)",
                padding: "0.9rem 1rem",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                margin: "10px 0"
              }}
            >
              <p style={{ margin: 0, color: "var(--text)", fontSize: "0.95rem" }}>
                No hay registros de asistencia consolidados para este ciclo.
              </p>
            </div>
          )}

          {/* Historial cronológico de clases del alumno */}
          {attendanceHistory.length > 0 && (
            <div style={{ marginTop: "10px" }}>
              <h4 style={{ fontSize: "0.9rem", color: "var(--text)", margin: "0 0 8px" }}>
                Historial de clases asistidas ({attendanceHistory.length})
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: "200px", overflowY: "auto" }}>
                {attendanceHistory.map((clase, idx) => (
                  <li
                    key={idx}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      marginBottom: "6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.85rem"
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: "var(--text-h)" }}>
                        {formatFecha(clase.fecha)}
                      </span>{" "}
                      · {clase.tema || "Clase sin tema"}
                    </div>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        color:
                          clase.estado === ATTENDANCE_STATES.PRESENTE
                            ? "var(--accent)"
                            : clase.estado === ATTENDANCE_STATES.AUSENTE
                            ? "var(--danger)"
                            : "#d97706"
                      }}
                    >
                      {clase.estado}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 5. OBSERVACIONES PEDAGÓGICAS CONSOLIDADAS (#350 HU-32) */}
          <h2 style={{ marginTop: "24px" }}>Observaciones pedagógicas del equipo docente</h2>
          {allObservations.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
              {allObservations.map((obs, idx) => (
                <li
                  key={idx}
                  style={{
                    background: "var(--surface)",
                    padding: "10px 14px",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    marginBottom: "8px",
                    boxShadow: "var(--shadow-soft)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        color: "var(--accent)",
                        background: "var(--accent-light)",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}
                    >
                      {obs.origen}
                    </span>
                    <small style={{ color: "var(--text)" }}>{formatFecha(obs.fecha)}</small>
                  </div>
                  <p style={{ margin: "4px 0", color: "var(--text-h)", fontSize: "0.92rem" }}>
                    {obs.texto}
                  </p>
                  {obs.detalle && (
                    <small style={{ color: "var(--text)", fontSize: "0.8rem" }}>
                      {obs.detalle}
                    </small>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div
              style={{
                background: "var(--bg)",
                padding: "0.9rem 1rem",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                marginTop: "10px"
              }}
            >
              <p style={{ margin: 0, color: "var(--text)", fontSize: "0.95rem" }}>
                Sin observaciones pedagógicas registradas para este alumno.
              </p>
            </div>
          )}

          {/* 6. INFORMACIÓN DE CONTACTO Y DATOS PERSONALES */}
          <h2 style={{ marginTop: "24px" }}>Datos de contacto y tutor</h2>
          {profile.contacto ? (
            <dl className="course-detail-info">
              <dt>Email</dt>
              <dd>{profile.contacto.email || "-"}</dd>
              <dt>Teléfono</dt>
              <dd>{profile.contacto.telefono || "-"}</dd>
              <dt>Adulto responsable / Tutor</dt>
              <dd>{profile.contacto.tutor_nombre || "-"}</dd>
              <dt>Teléfono del tutor</dt>
              <dd>{profile.contacto.tutor_telefono || "-"}</dd>
            </dl>
          ) : (
            <div
              style={{
                background: "var(--bg)",
                padding: "0.9rem 1rem",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                marginTop: "10px"
              }}
            >
              <p style={{ margin: 0, color: "var(--text)", fontSize: "0.95rem" }}>
                Sin datos de contacto cargados en el sistema para este alumno.
              </p>
            </div>
          )}

          {/* 7. RESUMEN ACADÉMICO E HISTORIAL DE CURSOS */}
          <h2 style={{ marginTop: "24px" }}>Historial y trayectoria académica</h2>
          <div
            style={{
              background: "var(--bg)",
              padding: "1rem",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              marginBottom: "1rem"
            }}
          >
            <p style={{ marginBottom: "6px" }}>
              <strong>Materias totales cursadas:</strong>{" "}
              {profile.resumen_academico?.total_materias || 0}
            </p>
            <p>
              <strong>Materias activas:</strong>{" "}
              {profile.resumen_academico?.materias_activas || 0}
            </p>
          </div>

          {history.length === 0 ? (
            <p style={{ color: "var(--text)" }}>No hay historial registrado.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[...history]
                .sort((a, b) => String(b.periodo).localeCompare(String(a.periodo)))
                .map((h) => (
                  <li
                    key={h.id_inscripcion}
                    style={{
                      background: "var(--surface)",
                      padding: "0.9rem 1rem",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      marginBottom: "0.6rem",
                      boxShadow: "var(--shadow-soft)"
                    }}
                  >
                    <strong style={{ color: "var(--text-h)" }}>{h.curso}</strong> — {h.materia}{" "}
                    <br />
                    <small style={{ color: "var(--text)" }}>
                      Estado: <strong>{h.estado}</strong> | Ciclo: {h.periodo}
                    </small>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

export default StudentProfile;
