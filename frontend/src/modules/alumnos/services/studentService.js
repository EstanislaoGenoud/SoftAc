const API_URL = 'http://localhost:3000';

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/** Unifica alumnos de la API ({ nombre, apellido, identificacion }) y de prueba ({ name, dni }). */
export function normalizeStudent(student) {
    const fullName = [student.nombre, student.apellido].filter(Boolean).join(' ');
    return {
        ...student,
        id: String(student.id ?? student.alumnoId),
        name: student.name || fullName || student.nombreCompleto || 'Alumno sin nombre',
        dni: student.dni || student.identificacion || ''
    };
}

export async function getStudentsByCourse(cursoId) {
    const response = await fetch(`${API_URL}/alumnos/curso/${cursoId}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener alumnos');
    return await response.json();
}

export async function searchStudents(query) {
    const response = await fetch(`${API_URL}/alumnos/buscar?q=${query}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al buscar alumnos');
    return await response.json();
}

export async function getStudentProfile(alumnoId) {
    const response = await fetch(`${API_URL}/alumnos/${alumnoId}/perfil`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al cargar perfil del alumno');
    return await response.json();
}

export async function getStudentHistory(alumnoId) {
    const response = await fetch(`${API_URL}/alumnos/${alumnoId}/historial`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al cargar historial del alumno');
    return await response.json();
}

/**
 * HU-06 / Inscripción de alumnos:
 * Endpoint backend: POST /alumnos/inscribir
 * Body: { nombre, apellido, identificacion, cursoMateriaId }
 */
export async function enrollStudent(data) {
    let targetCursoMateriaId = data.cursoMateriaId;

    if (!targetCursoMateriaId && data.cursoId) {
        try {
            const responseClases = await fetch(`${API_URL}/clases/curso/${data.cursoId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (responseClases.ok) {
                const clases = await responseClases.json();
                if (Array.isArray(clases) && clases.length > 0 && clases[0].curso_materia_id) {
                    targetCursoMateriaId = clases[0].curso_materia_id;
                }
            }
        } catch {
            // Continuar con fallback
        }

        if (!targetCursoMateriaId) {
            targetCursoMateriaId = data.cursoId;
        }
    }

    const payload = {
        nombre: (data.nombre || '').trim(),
        apellido: (data.apellido || '').trim(),
        identificacion: data.identificacion ? String(data.identificacion).trim() : undefined,
        cursoMateriaId: targetCursoMateriaId
    };

    const response = await fetch(`${API_URL}/alumnos/inscribir`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al inscribir alumno en el curso');
    }

    return await response.json();
}
