const API_URL = 'http://localhost:3000';

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

export async function getSchools(){
    const response = await fetch(`${API_URL}/escuelas`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener escuelas');
    return await response.json();
}

export async function getSchoolById(id){
    const response = await fetch(`${API_URL}/escuelas/${id}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener detalle de la escuela');
    return await response.json();
}

export async function createSchool(newSchool) {
    const response = await fetch(`${API_URL}/escuelas`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newSchool)
    });
    if (!response.ok) throw new Error('Error al crear la escuela');
    return await response.json();
}

export async function updateSchool(id, updatedSchool){
    const response = await fetch(`${API_URL}/escuelas/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedSchool)
    });
    if (!response.ok) throw new Error('Error al actualizar la escuela');
    return await response.json();
}

export async function deleteSchool(id){
    const response = await fetch(`${API_URL}/escuelas/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al desvincular la escuela');
    return await response.json();
}