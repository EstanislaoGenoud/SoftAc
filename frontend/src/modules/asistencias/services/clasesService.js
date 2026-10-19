const API_URL = 'http://localhost:3000';

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * HU-17: Registrar una nueva clase
 * Endpoint backend: POST /clases
 * Body: { cursoMateriaId, fecha, estado, tema }
 * Nota: 'observaciones' se incluye en la respuesta para el frontend si el backend aún no la persiste.
 */
export async function createClase(data) {
    const payload = {
        cursoMateriaId: data.cursoMateriaId,
        fecha: data.fecha,
        estado: data.estado || 'DICTADA',
        tema: data.tema
    };

    try {
        const response = await fetch(`${API_URL}/clases`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Error del servidor al registrar la clase');
        }

        const nuevaClase = await response.json();
        // Preservamos observaciones en el cliente si fueron ingresadas
        if (data.observaciones) {
            nuevaClase.observaciones = data.observaciones;
            guardarObservacionLocal(nuevaClase.id, data.observaciones);
        }

        return nuevaClase;
    } catch (error) {
        console.warn("Aviso API Clases (usando fallback mock local):", error.message);
        // Fallback resiliente para desarrollo frontend si el backend tiene error de FK o está desconectado:
        const mockClase = {
            id: 'mock-clase-' + Date.now(),
            curso_materia_id: data.cursoMateriaId,
            fecha: data.fecha,
            estado: data.estado || 'DICTADA',
            tema: data.tema,
            observaciones: data.observaciones || '',
            _isMock: true
        };
        guardarClaseLocal(data.cursoMateriaId, mockClase);
        return mockClase;
    }
}

/**
 * HU-18: Consultar clases de un curso / materia
 * Endpoint backend: GET /clases/curso-materia/:id
 */
export async function getClasesByCursoMateria(cursoMateriaId) {
    try {
        const response = await fetch(`${API_URL}/clases/curso-materia/${cursoMateriaId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Error al obtener clases del curso');
        const clases = await response.json();

        // Enriquecer con observaciones locales si existían
        const clasesEnriquecidas = clases.map(c => ({
            ...c,
            observaciones: c.observaciones || obtenerObservacionLocal(c.id) || ''
        }));

        // Combinar con clases mock locales si hubiera
        const mocks = obtenerClasesLocales(cursoMateriaId);
        return [...clasesEnriquecidas, ...mocks].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    } catch (error) {
        console.warn("Aviso API Clases (fallback a almacenamiento local):", error.message);
        return obtenerClasesLocales(cursoMateriaId);
    }
}

/**
 * HU-18: Consultar la última clase registrada de un curso
 * Obtiene las clases ordenadas cronológicamente (más reciente primero)
 * y retorna la primera clase o null si aún no se registraron clases.
 */
export async function getUltimaClase(cursoMateriaId) {
    try {
        const clases = await getClasesByCursoMateria(cursoMateriaId);
        if (!clases || clases.length === 0) return null;
        return clases[0];
    } catch (error) {
        console.warn("Error al consultar la última clase:", error);
        return null;
    }
}

/**
 * HU-19: Registrar o actualizar observaciones de una clase
 * Guarda la observación en caché local (para resiliencia y modo offline)
 * e intenta sincronizarla con el backend mediante PATCH /clases/:id.
 */
export async function saveObservacionClase(claseId, observacion) {
    guardarObservacionLocal(claseId, observacion);
    actualizarObservacionEnClasesLocales(claseId, observacion);

    try {
        const response = await fetch(`${API_URL}/clases/${claseId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ observaciones: observacion })
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.warn("Aviso API Clases (persistencia local de observaciones):", error.message);
    }
    return { id: claseId, observaciones: observacion };
}



/* Helpers de almacenamiento local provisional para observaciones y modo offline */
function guardarObservacionLocal(claseId, obs) {
    try {
        localStorage.setItem(`softac_obs_clase_${claseId}`, obs);
    } catch {}
}

function actualizarObservacionEnClasesLocales(claseId, obs) {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("softac_clases_")) {
                const list = JSON.parse(localStorage.getItem(key) || "[]");
                let updated = false;
                const newList = list.map(c => {
                    if (c.id === claseId) {
                        updated = true;
                        return { ...c, observaciones: obs };
                    }
                    return c;
                });
                if (updated) {
                    localStorage.setItem(key, JSON.stringify(newList));
                }
            }
        }
    } catch {}
}

function obtenerObservacionLocal(claseId) {
    try {
        return localStorage.getItem(`softac_obs_clase_${claseId}`) || '';
    } catch {
        return '';
    }
}

function guardarClaseLocal(cursoMateriaId, clase) {
    try {
        const key = `softac_clases_${cursoMateriaId}`;
        const actuales = JSON.parse(localStorage.getItem(key) || '[]');
        actuales.unshift(clase);
        localStorage.setItem(key, JSON.stringify(actuales));
    } catch {}
}

function obtenerClasesLocales(cursoMateriaId) {
    try {
        const key = `softac_clases_${cursoMateriaId}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}
