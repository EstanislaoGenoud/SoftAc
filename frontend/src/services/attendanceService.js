const API_URL = 'http://localhost:3000';

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// HU-12 (#173): Obtener catálogo de estados
export async function getAttendanceStates() {
  const response = await fetch(`${API_URL}/asistencias/estados`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al obtener catálogo de estados de asistencia');
  return await response.json();
}

// HU-11 (#162): Obtener alumnos del curso para tomar asistencia
export async function getStudentsForAttendance(courseId) {
  const response = await fetch(`${API_URL}/asistencias/curso/${courseId}/alumnos`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al obtener alumnos del curso');
  return await response.json();
}

// HU-11 (#162): Obtener alumnos de una clase específica y su asistencia previa
export async function getStudentsForClassAttendance(classId) {
  const response = await fetch(`${API_URL}/asistencias/clase/${classId}/alumnos`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al obtener lista de alumnos de la clase');
  return await response.json();
}

// HU-11 (#164, #168): Guardado masivo de asistencia
export async function saveBulkAttendance(classId, records) {
  const response = await fetch(`${API_URL}/asistencias/clase/${classId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ registros: records })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al registrar asistencias masivamente');
  }
  return await response.json();
}

// HU-13 (#187): Consultar asistencia por clase
export async function getAttendanceByClass(classId) {
  const response = await fetch(`${API_URL}/asistencias/clase/${classId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al consultar asistencia de la clase');
  return await response.json();
}

// HU-13 (#186): Historial cronológico de un alumno
export async function getStudentAttendanceHistory(studentId, courseMateriaId) {
  const query = courseMateriaId ? `?cursoMateriaId=${courseMateriaId}` : '';
  const response = await fetch(`${API_URL}/asistencias/alumno/${studentId}/historial${query}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al obtener historial del alumno');
  return await response.json();
}

// HU-14 (#190, #194): Modificar registro de asistencia
export async function updateAttendance(attendanceId, data) {
  const response = await fetch(`${API_URL}/asistencias/${attendanceId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Error al modificar asistencia');
  return await response.json();
}

// HU-15 (#201): Obtener cálculo de porcentaje por alumno
export async function getAttendancePercentageByStudent(studentId, courseMateriaId) {
  const query = courseMateriaId ? `?cursoMateriaId=${courseMateriaId}` : '';
  const response = await fetch(`${API_URL}/asistencias/porcentaje/alumno/${studentId}${query}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al calcular porcentaje del alumno');
  return await response.json();
}

// HU-15 (#201): Obtener cálculo de porcentaje para todo el curso
export async function getAttendancePercentagesByCourse(courseId) {
  const response = await fetch(`${API_URL}/asistencias/porcentaje/curso/${courseId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al calcular porcentajes del curso');
  return await response.json();
}

// HU-16 (#209): Consultar alumnos con riesgo de inasistencia
export async function getAtRiskStudents(courseId, umbral = 75) {
  const response = await fetch(`${API_URL}/asistencias/riesgo/curso/${courseId}?umbral=${umbral}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al consultar alumnos en riesgo');
  return await response.json();
}

// HU-17 (#220): Registrar una clase
export async function createClass(data) {
  const response = await fetch(`${API_URL}/clases`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al registrar la clase');
  }
  return await response.json();
}

// HU-18 (#226): Consultar la última clase
export async function getLatestClass(courseId) {
  const response = await fetch(`${API_URL}/clases/curso/${courseId}/ultima`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Error al consultar última clase');
  }
  return await response.json();
}

// HU-19 (#233, #234): Actualizar observaciones de la clase
export async function updateClassObservations(classId, observaciones) {
  const response = await fetch(`${API_URL}/clases/${classId}/observaciones`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ observaciones })
  });
  if (!response.ok) throw new Error('Error al actualizar observaciones de la clase');
  return await response.json();
}