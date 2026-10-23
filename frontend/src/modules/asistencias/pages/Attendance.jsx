import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { coursesData } from "@/modules/cursos";
import { getCourseById } from "@/modules/cursos/services/courseService";
import { studentsData } from "@/modules/alumnos";
import { getStudentsByCourse } from "@/modules/alumnos/services/studentService";
import { ArrowLeftIcon, CheckIcon, CrossIcon } from "@/shared/components/Icon";
import CreateClassModal from "../components/CreateClassModal";
import { getClasesByCursoMateria, saveObservacionClase } from "../services/clasesService";
import {
  ATTENDANCE_STATES,
  calculateAttendancePercentage,
  getAttendance,
  isStudentAtRisk,
  saveAttendance,
  summarizeAttendance
} from "../services/attendanceService";
import "../styles/Attendance.css";

const DEFAULT_RISK_LIMIT = 75;

function formatDate(date) {
  if (!date) return "-";
  const parts = String(date).split("T")[0].split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
}

function createDefaultRecords(students) {
  return students.reduce((result, student) => {
    result[student.id] = {
      alumnoId: String(student.id),
      estado: ATTENDANCE_STATES.PRESENTE,
      observacion: ""
    };
    return result;
  }, {});
}

function normalizeStudent(student) {
  const fullName = [student.nombre, student.apellido].filter(Boolean).join(" ");

  return {
    ...student,
    id: student.id ?? student.alumnoId,
    name: student.name || fullName || student.nombreCompleto || "Alumno sin nombre",
    dni: student.dni || student.identificacion || ""
  };
}

function Attendance() {
  const { id, courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(() => 
    coursesData.find((item) => String(item.id) === String(courseId)) || null
  );

  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [courseStudents, setCourseStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [attendanceByClass, setAttendanceByClass] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [riskLimit, setRiskLimit] = useState(() => {
    try {
      return Number(localStorage.getItem(`softac_risk_limit_${courseId}`)) || DEFAULT_RISK_LIMIT;
    } catch {
      return DEFAULT_RISK_LIMIT;
    }
  });
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesMessage, setNotesMessage] = useState("");

  // Cargar datos del curso desde la API con fallback local
  useEffect(() => {
    let isMounted = true;
    getCourseById(courseId)
      .then((data) => {
        if (isMounted && data) setCourse(data);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [courseId]);

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setStudentsLoading(true);
      setStudentsError("");

      try {
        const data = await getStudentsByCourse(courseId);
        if (!isMounted) return;

        const apiStudents = Array.isArray(data) ? data.map(normalizeStudent) : [];
        if (apiStudents.length > 0) {
          setCourseStudents(apiStudents);
          return;
        }

        throw new Error("La API no devolvió alumnos para este curso.");
      } catch {
        if (!isMounted) return;

        const localStudents = studentsData.filter(
          (student) => String(student.courseId) === String(courseId) || student.courseId === Number(courseId)
        );
        const fallbackStudents = localStudents.length > 0
          ? localStudents
          : studentsData.filter((student) => student.courseId === 1);

        setCourseStudents(fallbackStudents);
        setStudentsError("Alumnos de prueba cargados localmente porque la API no está disponible.");
      } finally {
        if (isMounted) setStudentsLoading(false);
      }
    }

    loadStudents();
    return () => { isMounted = false; };
  }, [courseId]);

  const selectedClass = classes.find((item) => String(item.id) === String(selectedClassId));
  const currentRecords = attendanceByClass[selectedClassId] || {};
  const currentRecordList = Object.values(currentRecords);
  const currentSummary = summarizeAttendance(currentRecordList);

  const allStudentRecords = useMemo(() => {
    return courseStudents.reduce((result, student) => {
      result[student.id] = Object.values(attendanceByClass)
        .map((records) => records[student.id] || records[String(student.id)])
        .filter(Boolean);
      return result;
    }, {});
  }, [attendanceByClass, courseStudents]);

  const courseRecordList = Object.values(allStudentRecords).flat();
  const coursePercentage = calculateAttendancePercentage(courseRecordList);
  const studentsAtRisk = courseStudents.filter((student) =>
    isStudentAtRisk(allStudentRecords[student.id], riskLimit)
  );

  useEffect(() => {
    let isMounted = true;

    async function loadClasses() {
      setClassesLoading(true);
      setClassesError("");
      try {
        const data = await getClasesByCursoMateria(courseId);
        if (!isMounted) return;
        setClasses(data);
        setSelectedClassId((current) => current || String(data[0]?.id || ""));
      } catch (error) {
        if (isMounted) setClassesError(error.message || "No se pudieron cargar las clases.");
      } finally {
        if (isMounted) setClassesLoading(false);
      }
    }

    loadClasses();
    return () => { isMounted = false; };
  }, [courseId]);

  useEffect(() => {
    if (!selectedClassId || attendanceByClass[selectedClassId]) return;
    let isMounted = true;

    async function loadAttendance() {
      setAttendanceLoading(true);
      setAttendanceError("");
      try {
        const records = await getAttendance(selectedClassId);
        if (!isMounted) return;
        setAttendanceByClass((current) => ({
          ...current,
          [selectedClassId]: { ...createDefaultRecords(courseStudents), ...records }
        }));
      } catch (error) {
        if (isMounted) setAttendanceError(error.message || "No se pudo cargar la asistencia.");
      } finally {
        if (isMounted) setAttendanceLoading(false);
      }
    }

    loadAttendance();
    return () => { isMounted = false; };
  }, [selectedClassId, courseStudents, attendanceByClass]);

  function updateStudentState(studentId, estado) {
    setSaveMessage("");
    setAttendanceByClass((current) => ({
      ...current,
      [selectedClassId]: {
        ...(current[selectedClassId] || createDefaultRecords(courseStudents)),
        [studentId]: {
          ...(current[selectedClassId]?.[studentId] || { alumnoId: String(studentId) }),
          alumnoId: String(studentId),
          estado
        }
      }
    }));
  }

  async function handleSaveAttendance() {
    if (!selectedClassId || isSaving) return;
    setIsSaving(true);
    setSaveMessage("");
    const result = await saveAttendance(selectedClassId, currentRecords);
    setIsSaving(false);
    setSaveMessage(result.synced
      ? "Asistencia guardada correctamente en el servidor."
      : "Asistencia guardada localmente (modo offline).");
  }

  function handleClassCreated(newClass) {
    setClasses((current) => [newClass, ...current]);
    setSelectedClassId(String(newClass.id));
    setNotesDraft(newClass.observaciones || "");
    setIsEditingNotes(false);
    setAttendanceByClass((current) => ({
      ...current,
      [newClass.id]: createDefaultRecords(courseStudents)
    }));
    setIsCreateClassOpen(false);
    setSaveMessage("Clase registrada correctamente.");
  }

  function handleRiskLimitChange(event) {
    const value = Math.min(100, Math.max(0, Number(event.target.value)));
    setRiskLimit(value);
    try {
      localStorage.setItem(`softac_risk_limit_${courseId}`, String(value));
    } catch {
      // La configuración sigue activa durante esta sesión.
    }
  }

  async function handleSaveNotes() {
    if (!selectedClass) return;
    await saveObservacionClase(selectedClass.id, notesDraft.trim());
    setClasses((current) => current.map((item) => (
      item.id === selectedClass.id ? { ...item, observaciones: notesDraft.trim() } : item
    )));
    setIsEditingNotes(false);
    setNotesMessage("Observaciones guardadas en el servidor.");
  }

  return (
    <main className="attendance-page">
      <section className="attendance-card">
        <header className="attendance-header">
          <button
            type="button"
            className="attendance-back-button"
            onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}`)}
          >
            <ArrowLeftIcon /> Volver al curso
          </button>
          <span className="attendance-kicker">Asistencia</span>
          <h1>{course?.nombre || course?.name || "Curso"}</h1>
          <h2>Registro de asistencia</h2>
          <p className="attendance-summary">{courseStudents.length} alumnos</p>
        </header>

        <section className="attendance-top-actions" aria-label="Gestión de clases">
          <div className="class-current-badge">
            <small>Clase actual</small>
            <span>
              {selectedClass
                ? `${formatDate(selectedClass.fecha)} · ${selectedClass.tema || "Sin tema"}`
                : "Todavía no seleccionaste una clase"}
            </span>
          </div>
          <label className="attendance-class-selector" htmlFor="attendance-class">
            <span>Clase</span>
            <select
              id="attendance-class"
              className="attendance-class-select"
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              disabled={classesLoading || classes.length === 0}
            >
              {classes.length === 0 && <option value="">No hay clases registradas</option>}
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatDate(item.fecha)} · {item.tema || "Sin tema"}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-new-class" onClick={() => setIsCreateClassOpen(true)}>
            + Registrar clase
          </button>
        </section>

        {classesLoading && <p className="attendance-feedback" role="status">Cargando clases...</p>}
        {classesError && <p className="attendance-feedback attendance-feedback-error" role="alert">{classesError}</p>}
        {!classesLoading && !classesError && classes.length === 0 && (
          <p className="attendance-feedback">No hay clases registradas. Creá una clase para comenzar.</p>
        )}

        {selectedClass && (
          <>
            <section className="attendance-class-notes" aria-labelledby="class-notes-title">
              <div className="class-notes-header">
                <h3 id="class-notes-title" className="class-notes-title">Observaciones de la clase</h3>
                {!isEditingNotes && (
                  <button type="button" className="btn-edit-note" onClick={() => { setNotesDraft(selectedClass.observaciones || ""); setIsEditingNotes(true); }}>
                    Editar
                  </button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="class-notes-form">
                  <textarea
                    className="class-notes-textarea"
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    aria-label="Observaciones de la clase"
                  />
                  <div className="class-notes-actions">
                    <button type="button" className="btn-cancel-note" onClick={() => setIsEditingNotes(false)}>Cancelar</button>
                    <button type="button" className="btn-save-note" onClick={handleSaveNotes}>Guardar</button>
                  </div>
                </div>
              ) : (
                <p className={selectedClass.observaciones ? "class-note-content" : "class-note-empty"}>
                  {selectedClass.observaciones || "Sin observaciones registradas."}
                </p>
              )}
              {notesMessage && <small className="attendance-inline-message" role="status">{notesMessage}</small>}
            </section>

            <section className="attendance-overview" aria-label="Resumen de asistencia">
              <div><strong>{currentSummary.porcentaje ?? 0}%</strong><span>Clase seleccionada</span></div>
              <div><strong>{coursePercentage ?? 0}%</strong><span>Curso</span></div>
              <div><strong>{studentsAtRisk.length}</strong><span>En riesgo</span></div>
            </section>

            <div className="risk-settings">
              <label htmlFor="risk-limit">Riesgo si la asistencia es menor a (%)</label>
              <input id="risk-limit" type="number" min="0" max="100" value={riskLimit} onChange={handleRiskLimitChange} />
            </div>

            {attendanceLoading && <p className="attendance-feedback" role="status">Cargando asistencia...</p>}
            {attendanceError && <p className="attendance-feedback attendance-feedback-error" role="alert">{attendanceError}</p>}
            {studentsLoading && <p className="attendance-feedback" role="status">Cargando alumnos...</p>}
            {studentsError && <p className="attendance-feedback" role="status">{studentsError}</p>}

            <section className="attendance-student-list" aria-label="Alumnos">
              {courseStudents.length === 0 && !studentsLoading ? (
                <p className="attendance-feedback">No hay alumnos para este curso.</p>
              ) : courseStudents.map((student) => {
                const record = currentRecords[student.id] || currentRecords[String(student.id)] || { estado: ATTENDANCE_STATES.PRESENTE };
                const percentage = calculateAttendancePercentage(allStudentRecords[student.id]);
                const atRisk = isStudentAtRisk(allStudentRecords[student.id], riskLimit);
                return (
                  <article key={student.id} className={`attendance-student ${atRisk ? "student-at-risk" : ""}`}>
                    <div>
                      <h3>{student.name}</h3>
                      <p>DNI: {student.dni}</p>
                      <p className="student-attendance-meta">
                        Asistencia: {percentage === null ? "Sin datos" : `${percentage}%`}
                        {atRisk && <strong className="risk-label"> · En riesgo</strong>}
                      </p>
                    </div>
                    <div className="attendance-controls" aria-label={`Estado de ${student.name}`}>
                      <button type="button" className={`present-button ${record.estado === ATTENDANCE_STATES.PRESENTE ? "is-selected" : ""}`} onClick={() => updateStudentState(student.id, ATTENDANCE_STATES.PRESENTE)}>
                        <CheckIcon /> Presente
                      </button>
                      <button type="button" className={`absent-button ${record.estado === ATTENDANCE_STATES.AUSENTE ? "is-selected" : ""}`} onClick={() => updateStudentState(student.id, ATTENDANCE_STATES.AUSENTE)}>
                        <CrossIcon /> Ausente
                      </button>
                      <button type="button" className={`half-absence-button ${record.estado === ATTENDANCE_STATES.MEDIA_FALTA ? "is-selected" : ""}`} onClick={() => updateStudentState(student.id, ATTENDANCE_STATES.MEDIA_FALTA)}>
                        ½ Media falta
                      </button>
                      <button 
                        type="button" 
                        className={`half-absence-button ${record.estado === ATTENDANCE_STATES.AUSENTE_CON_CERTIFICADO ? "is-selected" : ""}`}
                        style={record.estado === ATTENDANCE_STATES.AUSENTE_CON_CERTIFICADO ? { background: "#e0f2fe", color: "#0369a1", borderColor: "#0284c7" } : {}}
                        onClick={() => updateStudentState(student.id, ATTENDANCE_STATES.AUSENTE_CON_CERTIFICADO)}
                        title="Ausente justificado con certificado"
                      >
                        Justificada
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>

            <div className="attendance-save-actions">
              <button type="button" className="btn-save-attendance" onClick={handleSaveAttendance} disabled={isSaving || attendanceLoading}>
                {isSaving ? "Guardando..." : "Guardar asistencia"}
              </button>
              {saveMessage && <p role="status">{saveMessage}</p>}
            </div>
          </>
        )}
      </section>

      <CreateClassModal
        isOpen={isCreateClassOpen}
        onClose={() => setIsCreateClassOpen(false)}
        cursoId={courseId}
        cursoNombre={course?.nombre || course?.name}
        onClassCreated={handleClassCreated}
      />
    </main>
  );
}

export default Attendance;
