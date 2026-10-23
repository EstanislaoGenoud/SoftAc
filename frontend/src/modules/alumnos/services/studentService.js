const API_URL = 'http://localhost:3000';

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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
