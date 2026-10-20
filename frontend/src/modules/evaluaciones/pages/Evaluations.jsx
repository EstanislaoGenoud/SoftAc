import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { coursesData } from "@/modules/cursos";
import { studentsData } from "@/modules/alumnos";
import { ArrowLeftIcon, PlusIcon } from "@/shared/components/Icon";
import { calculateStudentAverage, createEvaluacionMock, getCalificacionesByEvaluacion, getEvaluacionesByCurso, getGradingConfigMock, getRecoveryConfigMock, MOCK_EVALUATION_TYPES, MOCK_GRADING_CATEGORIES, numericToQualitative, RECOVERY_MODES, saveCalificacionesMock, saveGradingConfigMock, saveRecoveryConfigMock } from "../services/evaluacionMockService";
import "../styles/Evaluations.css";

const initialForm = { nombre: "", fecha: "", tipo: "", evaluacionOriginalId: "", ponderacion: "0", descripcion: "" };

function Evaluations() {
  const { id, courseId } = useParams();
  const navigate = useNavigate();
  const course = coursesData.find((item) => String(item.id) === String(courseId));
  const courseStudents = studentsData.filter((student) => String(student.courseId) === String(courseId));
  const [evaluations, setEvaluations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedEvaluationId, setSelectedEvaluationId] = useState("");
  const [grades, setGrades] = useState({});
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesSaving, setGradesSaving] = useState(false);
  const [gradesMessage, setGradesMessage] = useState("");
  const [gradingConfig, setGradingConfig] = useState(getGradingConfigMock);
  const [recoveryConfig, setRecoveryConfig] = useState(() => getRecoveryConfigMock(courseId));
  const [gradesByEvaluation, setGradesByEvaluation] = useState({});
  const [selectedStudentId, setSelectedStudentId] = useState(() => String(courseStudents[0]?.id || ""));
  const [periodFilter, setPeriodFilter] = useState("year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const selectedEvaluation = evaluations.find((evaluation) => evaluation.id === selectedEvaluationId);
  const weightingTotal = Math.round(evaluations.reduce((total, evaluation) => total + Number(evaluation.ponderacion || 0), 0) * 100) / 100;
  const studentAverages = courseStudents.map((student) => ({
    student,
    result: calculateStudentAverage(student.id, evaluations, gradesByEvaluation, recoveryConfig.modo, gradingConfig.modelo)
  }));
  const validAverages = studentAverages.map((item) => item.result.average).filter((average) => average !== null);
  const averageCalculationEnabled = weightingTotal === 100;
  const courseAverage = averageCalculationEnabled && validAverages.length > 0
    ? Math.round((validAverages.reduce((total, average) => total + average, 0) / validAverages.length) * 100) / 100
    : null;

  const evolutionData = evaluations
    .filter((evaluation) => {
      if (!evaluation.fecha) return false;
      const date = new Date(`${evaluation.fecha}T00:00:00`);
      const month = date.getMonth();
      if (periodFilter === "year") return true;
      if (periodFilter === "q1") return month >= 0 && month <= 2;
      if (periodFilter === "q2") return month >= 3 && month <= 5;
      if (periodFilter === "q3") return month >= 6 && month <= 8;
      if (periodFilter === "q4") return month >= 9 && month <= 11;
      if (periodFilter === "h1") return month <= 5;
      if (periodFilter === "h2") return month >= 6;
      if (periodFilter === "custom") {
        return (!customFrom || evaluation.fecha >= customFrom) && (!customTo || evaluation.fecha <= customTo);
      }
      return true;
    })
    .map((evaluation) => ({
      evaluation,
      value: gradesByEvaluation[evaluation.id]?.[selectedStudentId]
    }))
    .filter((item) => item.value !== undefined && item.value !== "")
    .sort((a, b) => String(a.evaluation.fecha).localeCompare(String(b.evaluation.fecha)));

  const evolutionMax = gradingConfig.modelo === "cualitativo" ? 10 : 10;

  useEffect(() => {
    let active = true;
    async function loadEvaluations() {
      try {
        const data = await getEvaluacionesByCurso(courseId);
        if (!active) return;
        setEvaluations(data);
        const gradeEntries = await Promise.all(data.map(async (evaluation) => [evaluation.id, await getCalificacionesByEvaluacion(evaluation.id)]));
        if (active) setGradesByEvaluation(Object.fromEntries(gradeEntries));
      } catch {
        if (active) setError("No se pudieron cargar las evaluaciones.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadEvaluations();
    return () => { active = false; };
  }, [courseId]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
    setSuccess("");
  }

  async function selectEvaluation(evaluationId) {
    setSelectedEvaluationId(evaluationId);
    setGradesMessage("");
    setGradesLoading(true);
    try {
      setGrades(await getCalificacionesByEvaluacion(evaluationId));
    } finally {
      setGradesLoading(false);
    }
  }

  function updateGrade(studentId, value) {
    setGradesMessage("");
    setGrades((current) => ({ ...current, [studentId]: value }));
  }

  function updateGradingModel(event) {
    const nextConfig = { ...gradingConfig, modelo: event.target.value };
    setGradingConfig(nextConfig);
    saveGradingConfigMock(nextConfig);
    setGrades({});
    setGradesMessage("Modelo actualizado. Las nuevas notas usarán este formato.");
  }

  function updateRecoveryMode(event) {
    const nextConfig = { modo: event.target.value };
    setRecoveryConfig(nextConfig);
    saveRecoveryConfigMock(courseId, nextConfig);
  }

  async function handleSaveGrades(event) {
    event.preventDefault();
    if (!selectedEvaluationId || gradesSaving) return;
    setGradesSaving(true);
    setGradesMessage("");
    const result = await saveCalificacionesMock(selectedEvaluationId, grades, gradingConfig.modelo);
    setGradesByEvaluation((current) => ({ ...current, [selectedEvaluationId]: grades }));
    setGradesSaving(false);
    setGradesMessage(result.failed.length > 0
      ? `Se guardaron ${result.saved.length} notas y fallaron ${result.failed.length}. Revisá los valores indicados.`
      : `Se guardaron ${result.saved.length} notas. Los campos vacíos quedaron sin calificar.`);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSuccess("");
    if (!form.nombre.trim() || !form.fecha || !form.tipo || form.ponderacion === "" || (form.tipo === "Recuperatorio" && !form.evaluacionOriginalId)) {
      setError(form.tipo === "Recuperatorio"
        ? "El nombre, la fecha y la evaluación original son obligatorios."
        : "El nombre, la fecha, el tipo y la ponderación son obligatorios.");
      return;
    }

    const weight = Number(form.ponderacion);
    const nextWeightingTotal = weightingTotal + weight;
    if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
      setError("La ponderación debe estar entre 0% y 100%.");
      return;
    }
    if (nextWeightingTotal > 100) {
      setError(`No se puede superar el 100%. El total quedaría en ${nextWeightingTotal}%.`);
      return;
    }

    setSaving(true);
    try {
      const created = await createEvaluacionMock({ ...form, courseId });
      setEvaluations((current) => [created, ...current]);
      setGradesByEvaluation((current) => ({ ...current, [created.id]: {} }));
      setForm(initialForm);
      setSuccess("Evaluación creada correctamente. Se guardó como mock local.");
    } catch (submissionError) {
      setError(submissionError.message || "No se pudo crear la evaluación.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="evaluations-page">
      <section className="evaluations-card">
        <button type="button" className="evaluations-back" onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}`)}>
          <ArrowLeftIcon /> Volver al curso
        </button>
        <header className="evaluations-header">
          <span className="evaluations-kicker">Evaluaciones</span>
          <h1>{course?.name || "Curso"}</h1>
          <p>Creá una evaluación para organizar las próximas calificaciones.</p>
        </header>

        <section className="grading-config" aria-labelledby="grading-config-title">
          <div>
            <span className="evaluations-kicker">Configuración mock</span>
            <h2 id="grading-config-title">Modelo de calificación</h2>
            <p>Configuración temporal del sistema para este entorno frontend.</p>
          </div>
          <label htmlFor="grading-model">Modelo</label>
          <select id="grading-model" value={gradingConfig.modelo} onChange={updateGradingModel}>
            <option value="cuantitativo">Cuantitativo (1 a 10)</option>
            <option value="cualitativo">Cualitativo</option>
          </select>
          {gradingConfig.modelo === "cualitativo" && (
            <p className="grading-equivalence">Equivalencia de cálculo: Muy bueno = 10, Bueno = 8, Regular = 6, Insuficiente = 3.</p>
          )}
        </section>

        <form className="evaluation-form" onSubmit={handleSubmit}>
          <div className="evaluation-field">
            <label htmlFor="evaluation-name">Nombre de la evaluación *</label>
            <input id="evaluation-name" name="nombre" value={form.nombre} onChange={updateField} placeholder="Ej: Examen de fracciones" required />
          </div>
          {form.tipo === "Recuperatorio" && (
            <div className="evaluation-field">
              <label htmlFor="original-evaluation">Evaluación original *</label>
              <select id="original-evaluation" name="evaluacionOriginalId" value={form.evaluacionOriginalId} onChange={updateField} required>
                <option value="">Seleccionar evaluación original</option>
                {evaluations.filter((evaluation) => evaluation.tipo !== "Recuperatorio").map((evaluation) => (
                  <option key={evaluation.id} value={evaluation.id}>{evaluation.nombre} · {evaluation.fecha}</option>
                ))}
              </select>
              {evaluations.filter((evaluation) => evaluation.tipo !== "Recuperatorio").length === 0 && (
                <small className="evaluation-field-hint">Primero creá una evaluación original.</small>
              )}
            </div>
          )}
          <div className="evaluation-field">
            <label htmlFor="evaluation-weight">Ponderación (%) *</label>
            <input id="evaluation-weight" name="ponderacion" type="number" min="0" max="100" step="0.01" value={form.ponderacion} onChange={updateField} required />
            <small className="evaluation-field-hint">Debe sumar 100% entre las evaluaciones que participan del promedio.</small>
          </div>
          <div className="evaluation-field">
            <label htmlFor="evaluation-date">Fecha *</label>
            <input id="evaluation-date" name="fecha" type="date" value={form.fecha} onChange={updateField} required />
          </div>
          <div className="evaluation-field">
            <label htmlFor="evaluation-type">Tipo de evaluación *</label>
            <select id="evaluation-type" name="tipo" value={form.tipo} onChange={updateField} required>
              <option value="">Seleccionar tipo</option>
              {MOCK_EVALUATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="evaluation-field">
            <label htmlFor="evaluation-description">Descripción (opcional)</label>
            <textarea id="evaluation-description" name="descripcion" value={form.descripcion} onChange={updateField} placeholder="Temas incluidos, criterios o indicaciones" rows="3" />
          </div>
          {error && <p className="evaluation-message evaluation-message-error" role="alert">{error}</p>}
          {success && <p className="evaluation-message evaluation-message-success" role="status">{success}</p>}
          <button type="submit" className="evaluation-submit" disabled={saving}>
            <PlusIcon /> {saving ? "Guardando..." : "Crear evaluación"}
          </button>
        </form>

        <section className="evaluation-list-section" aria-labelledby="evaluation-list-title">
          <h2 id="evaluation-list-title">Evaluaciones del curso</h2>
          <div className={`weighting-summary ${weightingTotal === 100 ? "weighting-summary-complete" : ""}`} role="status">
            <strong>Total ponderado: {weightingTotal}%</strong>
            <span>{weightingTotal < 100 ? "Configuración incompleta: el promedio quedará bloqueado." : weightingTotal > 100 ? "El total supera el máximo permitido." : "Configuración lista para calcular el promedio."}</span>
          </div>
          <section className="recovery-config" aria-labelledby="recovery-config-title">
            <div>
              <h3 id="recovery-config-title">Cómo impacta el recuperatorio</h3>
              <p>Las dos notas permanecen visibles. Elegí cómo calcular el promedio.</p>
            </div>
            <label htmlFor="recovery-mode">Regla para este curso</label>
            <select id="recovery-mode" value={recoveryConfig.modo} onChange={updateRecoveryMode}>
              <option value={RECOVERY_MODES.MAYOR}>Tomar la nota mayor</option>
              <option value={RECOVERY_MODES.PROMEDIO}>Promediar ambas notas</option>
            </select>
          </section>
          <section className="average-section" aria-labelledby="average-title">
            <div className="average-section-header">
              <div>
                <span className="evaluations-kicker">Promedio</span>
                <h3 id="average-title">Promedio del curso</h3>
              </div>
              <strong>{!averageCalculationEnabled ? "Bloqueado" : courseAverage === null ? "Sin datos" : courseAverage}</strong>
            </div>
            <p className="average-help">Solo se consideran evaluaciones con nota. Si falta la nota original, se usa la del recuperatorio asociado.</p>
            <div className="average-student-list">
              {studentAverages.map(({ student, result }) => (
                <div className="average-student-row" key={student.id}>
                  <span>{student.name}</span>
                  <strong>{!averageCalculationEnabled ? "Bloqueado por ponderación" : result.average === null ? "Sin notas válidas" : gradingConfig.modelo === "cualitativo" ? `${numericToQualitative(result.average)} (${result.average})` : result.average}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="evolution-section" aria-labelledby="evolution-title">
            <div className="evolution-header">
              <div>
                <span className="evaluations-kicker">Evolución</span>
                <h3 id="evolution-title">Evolución académica individual</h3>
              </div>
            </div>
            <div className="evolution-filters">
              <label htmlFor="evolution-student">Alumno</label>
              <select id="evolution-student" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
                {courseStudents.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
              </select>
              <label htmlFor="evolution-period">Período</label>
              <select id="evolution-period" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}>
                <option value="year">Año lectivo</option>
                <option value="q1">Primer trimestre</option>
                <option value="q2">Segundo trimestre</option>
                <option value="q3">Tercer trimestre</option>
                <option value="q4">Cuarto trimestre</option>
                <option value="h1">Primer cuatrimestre</option>
                <option value="h2">Segundo cuatrimestre</option>
                <option value="custom">Rango personalizado</option>
              </select>
              {periodFilter === "custom" && (
                <div className="evolution-custom-range">
                  <label htmlFor="evolution-from">Desde</label>
                  <input id="evolution-from" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
                  <label htmlFor="evolution-to">Hasta</label>
                  <input id="evolution-to" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
                </div>
              )}
            </div>
            {evolutionData.length === 0 ? (
              <p className="evaluation-empty">No hay calificaciones para este alumno y período.</p>
            ) : (
              <>
                <div className="evolution-chart" role="img" aria-label="Gráfico de evolución de calificaciones">
                  {evolutionData.map(({ evaluation, value }) => {
                    const numericValue = gradingConfig.modelo === "cualitativo" ? (value === "Muy bueno" ? 10 : value === "Bueno" ? 8 : value === "Regular" ? 6 : 3) : Number(value);
                    return (
                      <div className="evolution-point" key={evaluation.id}>
                        <div className="evolution-bar-track"><div className="evolution-bar" style={{ height: `${Math.max(8, (numericValue / evolutionMax) * 100)}%` }} /></div>
                        <strong>{value}</strong>
                        <span>{evaluation.fecha}</span>
                        <small>{evaluation.nombre}</small>
                      </div>
                    );
                  })}
                </div>
                <table className="evolution-table">
                  <caption>Detalle textual de la evolución</caption>
                  <thead><tr><th>Fecha</th><th>Evaluación</th><th>Calificación</th></tr></thead>
                  <tbody>{evolutionData.map(({ evaluation, value }) => <tr key={`row-${evaluation.id}`}><td>{evaluation.fecha}</td><td>{evaluation.nombre}</td><td>{value}</td></tr>)}</tbody>
                </table>
              </>
            )}
          </section>
          {loading && <p className="evaluation-empty">Cargando evaluaciones...</p>}
          {!loading && evaluations.length === 0 && <p className="evaluation-empty">Todavía no hay evaluaciones creadas.</p>}
          {!loading && evaluations.length > 0 && (
            <div className="evaluation-list">
              {evaluations.map((evaluation) => (
                <article className={`evaluation-item ${selectedEvaluationId === evaluation.id ? "evaluation-item-selected" : ""}`} key={evaluation.id}>
                  <div>
                    <h3>{evaluation.nombre}</h3>
                    <p>{evaluation.tipo || "Sin tipo"} · {evaluation.fecha} · {Number(evaluation.ponderacion || 0)}%</p>
                    {evaluation.evaluacionOriginalId && (
                      <p className="recovery-reference">
                        Recupera: {evaluations.find((original) => original.id === evaluation.evaluacionOriginalId)?.nombre || "Evaluación original"}
                      </p>
                    )}
                  </div>
                  {evaluation.descripcion && <p className="evaluation-description">{evaluation.descripcion}</p>}
                  <button type="button" className="evaluation-grade-button" onClick={() => selectedEvaluationId === evaluation.id ? (setSelectedEvaluationId(""), setGradesMessage("")) : selectEvaluation(evaluation.id)}>
                    {selectedEvaluationId === evaluation.id ? "Cerrar carga de notas" : "Cargar notas"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedEvaluation && (
          <section className="grades-section" aria-labelledby="grades-title">
            <header className="grades-header">
              <div>
                <span className="evaluations-kicker">Carga múltiple</span>
                <h2 id="grades-title">Notas: {selectedEvaluation.nombre}</h2>
                <p>{gradingConfig.modelo === "cuantitativo" ? "Ingresá valores entre 1 y 10. Podés usar decimales." : "Seleccioná una categoría cualitativa para cada alumno."}</p>
              </div>
            </header>
            {gradesLoading ? <p className="evaluation-empty">Cargando notas...</p> : (
              <form className="grades-form" onSubmit={handleSaveGrades}>
                <div className="grades-list">
                  {courseStudents.map((student) => (
                    <div className="grade-row" key={student.id}>
                      <label htmlFor={`grade-${student.id}`}>
                        <strong>{student.name}</strong>
                        <span>DNI: {student.dni}</span>
                      </label>
                      {gradingConfig.modelo === "cuantitativo" ? (
                        <input
                          id={`grade-${student.id}`}
                          type="number"
                          min="1"
                          max="10"
                          step="0.01"
                          inputMode="decimal"
                          value={grades[student.id] ?? ""}
                          onChange={(event) => updateGrade(student.id, event.target.value)}
                          placeholder="Sin nota"
                          aria-label={`Nota de ${student.name}`}
                        />
                      ) : (
                        <select id={`grade-${student.id}`} value={grades[student.id] ?? ""} onChange={(event) => updateGrade(student.id, event.target.value)} aria-label={`Categoría de ${student.name}`}>
                          <option value="">Sin nota</option>
                          {MOCK_GRADING_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
                {gradesMessage && <p className="evaluation-message evaluation-message-success" role="status">{gradesMessage}</p>}
                <button type="submit" className="evaluation-submit" disabled={gradesSaving}>
                  {gradesSaving ? "Guardando notas..." : "Guardar notas"}
                </button>
              </form>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

export default Evaluations;
