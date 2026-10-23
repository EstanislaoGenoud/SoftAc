const API_URL = "http://localhost:3000";
const STORAGE_PREFIX = "softac_asistencia_";

export const ATTENDANCE_STATES = {
  PRESENTE: "PRESENTE",
  AUSENTE: "AUSENTE",
  MEDIA_FALTA: "MEDIA_FALTA"
};

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

function storageKey(claseId) {
  return `${STORAGE_PREFIX}${claseId}`;
}

function syncedKey(claseId) {
  return `${STORAGE_PREFIX}synced_${claseId}`;
}

function readLocalAttendance(claseId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(claseId)) || "{}");
  } catch {
    return {};
  }
}

function writeLocalAttendance(claseId, records) {
  try {
    localStorage.setItem(storageKey(claseId), JSON.stringify(records));
  } catch {
    // El registro en memoria continúa funcionando si el almacenamiento está lleno.
  }
}

function normalizeState(state) {
  if (state === ATTENDANCE_STATES.AUSENTE) return ATTENDANCE_STATES.AUSENTE;
  if (state === ATTENDANCE_STATES.MEDIA_FALTA) return ATTENDANCE_STATES.MEDIA_FALTA;
  return ATTENDANCE_STATES.PRESENTE;
}

export function attendanceValue(state) {
  const normalized = normalizeState(state);
  if (normalized === ATTENDANCE_STATES.AUSENTE) return 0;
  if (normalized === ATTENDANCE_STATES.MEDIA_FALTA) return 0.5;
  return 1;
}

export function calculateAttendancePercentage(records = []) {
  if (records.length === 0) return null;
  const total = records.reduce(
    (sum, record) => sum + attendanceValue(record.estado),
    0
  );
  return Math.round((total / records.length) * 100);
}

export function isStudentAtRisk(records = [], minimumPercentage = 75) {
  const percentage = calculateAttendancePercentage(records);
  return percentage !== null && percentage < Number(minimumPercentage);
}

export function summarizeAttendance(records = []) {
  const summary = records.reduce(
    (result, record) => {
      const state = normalizeState(record.estado);
      result[state] += 1;
      return result;
    },
    {
      [ATTENDANCE_STATES.PRESENTE]: 0,
      [ATTENDANCE_STATES.AUSENTE]: 0,
      [ATTENDANCE_STATES.MEDIA_FALTA]: 0
    }
  );

  return {
    ...summary,
    total: records.length,
    porcentaje: calculateAttendancePercentage(records)
  };
}

export async function getAttendance(claseId) {
  const localRecords = readLocalAttendance(claseId);

  try {
    const response = await fetch(`${API_URL}/asistencias/clase/${claseId}`, {
      method: "GET",
      headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error("No se pudo obtener la asistencia");
    const backendRecords = await response.json();
    const normalizedBackendRecords = backendRecords.reduce((result, item) => {
      result[item.alumno_id] = {
        alumnoId: item.alumno_id,
        estado: item.observacion === ATTENDANCE_STATES.MEDIA_FALTA
          ? ATTENDANCE_STATES.MEDIA_FALTA
          : item.presente
            ? ATTENDANCE_STATES.PRESENTE
            : ATTENDANCE_STATES.AUSENTE,
        observacion: item.observacion || ""
      };
      return result;
    }, {});

    return { ...normalizedBackendRecords, ...localRecords };
  } catch {
    return localRecords;
  }
}

export async function saveAttendance(claseId, records) {
  writeLocalAttendance(claseId, records);

  let alreadySynced = false;
  try {
    alreadySynced = localStorage.getItem(syncedKey(claseId)) === "true";
  } catch {
    alreadySynced = false;
  }

  if (alreadySynced) {
    return { records, synced: false, modifiedLocally: true };
  }

  const payload = Object.values(records).map((record) => ({
    alumnoId: String(record.alumnoId),
    // Media falta se conserva con precisión en frontend y se marca como presente
    // en la API compatible, dejando el estado explícito en observacion.
    presente: record.estado !== ATTENDANCE_STATES.AUSENTE,
    observacion: record.estado === ATTENDANCE_STATES.MEDIA_FALTA
      ? ATTENDANCE_STATES.MEDIA_FALTA
      : record.observacion || undefined
  }));

  try {
    const response = await fetch(`${API_URL}/asistencias/clase/${claseId}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ registros: payload })
    });

    if (!response.ok) throw new Error("No se pudo guardar la asistencia");
    try {
      localStorage.setItem(syncedKey(claseId), "true");
    } catch {
      // La asistencia ya fue aceptada por la API.
    }
    return { records, synced: true };
  } catch {
    return { records, synced: false };
  }
}

export function getStoredAttendance(claseId) {
  return readLocalAttendance(claseId);
}

export function getStudentRecords(studentId, attendanceByClass = {}) {
  return Object.values(attendanceByClass)
    .map((records) => records[studentId])
    .filter(Boolean);
}
