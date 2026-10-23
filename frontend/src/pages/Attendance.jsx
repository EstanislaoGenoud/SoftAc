import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCourseById } from "../services/courseService";
import { 
  getStudentsForAttendance, 
  saveBulkAttendance, 
  createClass, 
  getLatestClass,
  getAttendancePercentagesByCourse,
  getAtRiskStudents
} from "../services/attendanceService";
import "../styles/Attendance.css";

function Attendance() {
  const { id: schoolId, courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState("registro"); // "registro" | "metricas" | "riesgo"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Datos de la clase
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [tema, setTema] = useState("");
  const [observacionesClase, setObservacionesClase] = useState("");
  const [claseId, setClaseId] = useState(null);

  // Estado de asistencia por alumno: { [alumnoId]: { estado: 'PRESENTE'|'MEDIA_FALTA'|'AUSENTE'|'AUSENTE_CON_CERTIFICADO', observacion: '' } }
  const [attendance, setAttendance] = useState({});

  // Métricas y riesgo
  const [metricas, setMetricas] = useState([]);
  const [alumnosRiesgo, setAlumnosRiesgo] = useState([]);
  const [umbralRiesgo, setUmbralRiesgo] = useState(75);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // 1. Obtener curso
      const courseData = await getCourseById(courseId);
      setCourse(courseData);

      // 2. Obtener alumnos del curso
      const studentsData = await getStudentsForAttendance(courseId);
      setStudents(studentsData);

      // 3. Inicializar estados por defecto en PRESENTE
      const initialAttendance = {};
      studentsData.forEach(student => {
        initialAttendance[student.id] = {
          estado: student.asistencia?.estado || "PRESENTE",
          observacion: student.asistencia?.observacion || ""
        };
      });
      setAttendance(initialAttendance);

      // 4. Intentar cargar última clase
      const ultimaClase = await getLatestClass(courseId);
      if (ultimaClase) {
        setClaseId(ultimaClase.id);
        setTema(ultimaClase.tema || "");
        setObservacionesClase(ultimaClase.observaciones || "");
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Error al cargar los datos del curso o alumnos." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [courseId]);


  async function cargarMetricas() {
    try {
      setLoading(true);
      const data = await getAttendancePercentagesByCourse(courseId);
      setMetricas(data);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Error al cargar las métricas de asistencia." });
    } finally {
      setLoading(false);
    }
  }

  async function cargarRiesgo(umbral = umbralRiesgo) {
    try {
      setLoading(true);
      const data = await getAtRiskStudents(courseId, umbral);
      setAlumnosRiesgo(data);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Error al calcular alumnos en riesgo." });
    } finally {
      setLoading(false);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    setMessage(null);
    if (tab === "metricas") cargarMetricas();
    if (tab === "riesgo") cargarRiesgo();
  }

  function setStudentState(studentId, nuevoEstado) {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        estado: nuevoEstado
      }
    }));
  }

  function setStudentObservacion(studentId, obs) {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        observacion: obs
      }
    }));
  }

  async function handleGuardarAsistencia(e) {
    e.preventDefault();
    if (!students || students.length === 0) {
      setMessage({ type: "error", text: "No hay alumnos para registrar asistencia." });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      // 1. Asegurar o crear la clase
      let targetClaseId = claseId;
      if (!targetClaseId) {
        const nuevaClase = await createClass({
          cursoMateriaId: courseId,
          fecha,
          tema: tema || "Clase regular",
          observaciones: observacionesClase || null
        });
        targetClaseId = nuevaClase.id;
        setClaseId(nuevaClase.id);
      }

      // 2. Preparar el lote de registros masivos
      const registros = students.map(st => {
        const estadoInfo = attendance[st.id] || { estado: "PRESENTE", observacion: "" };
        return {
          alumnoId: st.id,
          estado: estadoInfo.estado,
          observacion: estadoInfo.observacion || null
        };
      });

      // 3. Guardado masivo (#168)
      await saveBulkAttendance(targetClaseId, registros);
      setMessage({ type: "success", text: "¡Asistencia registrada con éxito!" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Error al guardar la asistencia." });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !course) {
    return (
      <main className="attendance-page">
        <section className="attendance-card">
          <p>Cargando información del curso...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="attendance-page">
      <section className="attendance-card">
        <header className="attendance-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="attendance-kicker">Módulo de Asistencia</span>
              <h1>{course?.nombre ?? "Curso"}</h1>
              <h2>Gestión Académica</h2>
            </div>
            <button 
              type="button" 
              onClick={() => navigate(`/escuelas/${schoolId}/cursos/${courseId}`)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                cursor: "pointer"
              }}
            >
              ← Volver al Curso
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
            <button
              onClick={() => handleTabChange("registro")}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "bold",
                background: activeTab === "registro" ? "var(--accent)" : "transparent",
                color: activeTab === "registro" ? "#fff" : "var(--text)",
                cursor: "pointer"
              }}
            >
              Tomar Asistencia
            </button>
            <button
              onClick={() => handleTabChange("metricas")}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "bold",
                background: activeTab === "metricas" ? "var(--accent)" : "transparent",
                color: activeTab === "metricas" ? "#fff" : "var(--text)",
                cursor: "pointer"
              }}
            >
              Métricas & Porcentajes
            </button>
            <button
              onClick={() => handleTabChange("riesgo")}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "bold",
                background: activeTab === "riesgo" ? "var(--accent)" : "transparent",
                color: activeTab === "riesgo" ? "#fff" : "var(--text)",
                cursor: "pointer"
              }}
            >
              Alumnos en Riesgo
            </button>
          </div>

          {message && (
            <div style={{
              margin: "14px 0",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: message.type === "error" ? "#ffebee" : "#e8f5e9",
              color: message.type === "error" ? "#c62828" : "#2e7d32",
              fontWeight: 500
            }}>
              {message.text}
            </div>
          )}
        </header>

        {/* PESTAÑA 1: REGISTRO DE ASISTENCIA */}
        {activeTab === "registro" && (
          <form onSubmit={handleGuardarAsistencia}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", margin: "20px 0" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Fecha de la Clase</label>
                <input 
                  type="date" 
                  value={fecha} 
                  onChange={(e) => setFecha(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Tema Dictado</label>
                <input 
                  type="text" 
                  value={tema} 
                  onChange={(e) => setTema(e.target.value)}
                  placeholder="Ej: Unidad 2 - Introducción a bases de datos"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Observaciones de la Clase</label>
                <textarea 
                  rows={2}
                  value={observacionesClase} 
                  onChange={(e) => setObservacionesClase(e.target.value)}
                  placeholder="Comentarios sobre la clase, reprogramaciones o temas pendientes..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", resize: "vertical" }}
                />
              </div>
            </div>

            <p className="attendance-summary">
              {students.length} alumnos regulares inscriptos
            </p>

            <section className="attendance-student-list">
              {students.map((student) => {
                const currentStatus = attendance[student.id]?.estado || "PRESENTE";
                const currentObs = attendance[student.id]?.observacion || "";

                return (
                  <article key={student.id} className="attendance-student" style={{ flexDirection: "column", alignItems: "stretch" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                      <div>
                        <h3>{student.nombre} {student.apellido}</h3>
                        <p>DNI / Identificación: {student.identificacion || "S/D"}</p>
                      </div>

                      <div className="attendance-controls">
                        <button 
                          type="button"
                          onClick={() => setStudentState(student.id, "PRESENTE")}
                          style={{
                            background: currentStatus === "PRESENTE" ? "#e8f5e9" : "var(--surface)",
                            borderColor: currentStatus === "PRESENTE" ? "#4caf50" : "var(--border)",
                            color: currentStatus === "PRESENTE" ? "#2e7d32" : "var(--text-h)",
                            fontWeight: currentStatus === "PRESENTE" ? "bold" : "normal"
                          }}
                        >
                          Presente (1.0)
                        </button>

                        <button 
                          type="button"
                          onClick={() => setStudentState(student.id, "MEDIA_FALTA")}
                          style={{
                            background: currentStatus === "MEDIA_FALTA" ? "#fff8e1" : "var(--surface)",
                            borderColor: currentStatus === "MEDIA_FALTA" ? "#ffb300" : "var(--border)",
                            color: currentStatus === "MEDIA_FALTA" ? "#f57f17" : "var(--text-h)",
                            fontWeight: currentStatus === "MEDIA_FALTA" ? "bold" : "normal"
                          }}
                        >
                          Media Falta (0.5)
                        </button>

                        <button 
                          type="button"
                          onClick={() => setStudentState(student.id, "AUSENTE")}
                          style={{
                            background: currentStatus === "AUSENTE" ? "#ffebee" : "var(--surface)",
                            borderColor: currentStatus === "AUSENTE" ? "#f44336" : "var(--border)",
                            color: currentStatus === "AUSENTE" ? "#c62828" : "var(--text-h)",
                            fontWeight: currentStatus === "AUSENTE" ? "bold" : "normal"
                          }}
                        >
                          Ausente (0.0)
                        </button>

                        <button 
                          type="button"
                          onClick={() => setStudentState(student.id, "AUSENTE_CON_CERTIFICADO")}
                          style={{
                            background: currentStatus === "AUSENTE_CON_CERTIFICADO" ? "#e3f2fd" : "var(--surface)",
                            borderColor: currentStatus === "AUSENTE_CON_CERTIFICADO" ? "#2196f3" : "var(--border)",
                            color: currentStatus === "AUSENTE_CON_CERTIFICADO" ? "#1565c0" : "var(--text-h)",
                            fontWeight: currentStatus === "AUSENTE_CON_CERTIFICADO" ? "bold" : "normal"
                          }}
                        >
                          Justificada (Certificado)
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: "10px" }}>
                      <input 
                        type="text" 
                        placeholder="Observación opcional para este alumno (ej. Certificado médico, llegada tarde 10 min)"
                        value={currentObs}
                        onChange={(e) => setStudentObservacion(student.id, e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          fontSize: "0.85rem"
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </section>

            <div style={{ marginTop: "24px", textAlign: "right" }}>
              <button 
                type="submit" 
                disabled={saving || students.length === 0}
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "var(--accent)",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-soft)"
                }}
              >
                {saving ? "Guardando asistencias..." : "Guardar Asistencias Masivamente"}
              </button>
            </div>
          </form>
        )}

        {/* PESTAÑA 2: MÉTRICAS Y PORCENTAJES CALCULADOS (HU-15) */}
        {activeTab === "metricas" && (
          <div style={{ marginTop: "20px" }}>
            <h3>Porcentaje de Asistencia por Alumno</h3>
            <p style={{ color: "var(--text)", fontSize: "0.9rem", marginBottom: "16px" }}>
              Fórmula aplicada: <code>((Presentes × 1.0) + (Medias Faltas × 0.5) + (Justificadas × 1.0)) ÷ Total Clases × 100</code>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {metricas.map((m) => (
                <article key={m.alumno.id} className="attendance-student" style={{ justifyContent: "space-between" }}>
                  <div>
                    <h4>{m.alumno.nombre} {m.alumno.apellido}</h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                      Clases: {m.totalClases} | Pres.: {m.presentes} | Medias: {m.mediasFaltas} | Aus.: {m.ausentes} | Justif.: {m.ausentesConCertificado}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                      color: m.porcentaje >= 75 ? "#2e7d32" : m.porcentaje >= 60 ? "#f57f17" : "#c62828"
                    }}>
                      {m.porcentaje}%
                    </span>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text)" }}>
                      {m.faltasAcumuladas} faltas acum.
                    </p>
                  </div>
                </article>
              ))}
              {metricas.length === 0 && <p>No hay métricas disponibles aún.</p>}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: ALUMNOS EN RIESGO DE INASISTENCIA (HU-16) */}
        {activeTab === "riesgo" && (
          <div style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3>Detección de Alumnos en Riesgo</h3>
                <p style={{ color: "var(--text)", fontSize: "0.9rem" }}>
                  Alumnos con porcentaje inferior al límite configurable establecido.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label style={{ fontWeight: "bold", fontSize: "0.9rem" }}>Límite Configurable (%):</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  value={umbralRiesgo} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setUmbralRiesgo(val);
                    cargarRiesgo(val);
                  }}
                  style={{ width: "70px", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {alumnosRiesgo.map((r) => (
                <article 
                  key={r.alumno.id} 
                  className="attendance-student"
                  style={{
                    borderLeft: `6px solid ${r.estadoRiesgo === "LIBRE" ? "#c62828" : r.estadoRiesgo === "CRITICO" ? "#f57f17" : "#ffb300"}`
                  }}
                >
                  <div>
                    <h4>{r.alumno.nombre} {r.alumno.apellido}</h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                      Faltas acumuladas: {r.faltasAcumuladas} | Clases totales: {r.totalClases}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      backgroundColor: r.estadoRiesgo === "LIBRE" ? "#ffebee" : "#fff8e1",
                      color: r.estadoRiesgo === "LIBRE" ? "#c62828" : "#f57f17",
                      marginRight: "10px"
                    }}>
                      {r.estadoRiesgo}
                    </span>
                    <strong style={{ fontSize: "1.2rem", color: "#c62828" }}>{r.porcentaje}%</strong>
                  </div>
                </article>
              ))}

              {alumnosRiesgo.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", backgroundColor: "#e8f5e9", borderRadius: "8px", color: "#2e7d32" }}>
                  🎉 ¡Excelente! No hay alumnos en riesgo con el límite actual ({umbralRiesgo}%).
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default Attendance;