const API_URL = 'http://localhost:3000';

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

export async function getCoursesBySchool(schoolId) {
    const response = await fetch(`${API_URL}/cursos/escuela/${schoolId}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener cursos');
    return await response.json();
}

export async function getCourseById(courseId) {
    const response = await fetch(`${API_URL}/cursos/${courseId}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener detalle del curso');
    return await response.json();
}

export async function createCourse(data) {
    const response = await fetch(`${API_URL}/cursos`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al crear curso');
    return await response.json();
}
