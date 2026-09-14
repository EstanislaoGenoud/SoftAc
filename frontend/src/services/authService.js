const API_URL = 'http://localhost:3000';

export async function login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
        throw new Error('Credenciales inválidas');
    }
    
    const data = await response.json();
    
    // Guardamos el token real devuelto por NestJS
    localStorage.setItem("token", data.access_token);
    // Mantenemos la bandera de Emma para no romper sus rutas
    localStorage.setItem("isLoggedIn", "true");
    
    return data;
}

export async function logout() {
    const token = localStorage.getItem("token");
    if (token) {
        // Llamamos al backend para meter el token en la Lista Negra
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            }
        }).catch(err => console.error("Error al hacer logout:", err));
    }
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
}

export function isAuthenticated() {
    return localStorage.getItem("isLoggedIn") === "true";
}

// Conexión real con el backend para recuperar contraseña
export async function forgotPassword(email) {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    if (!response.ok) throw new Error('Error al solicitar recuperación');
    return await response.json();
}

export async function resetPassword(token, newPassword) {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
    });
    if (!response.ok) throw new Error('Token inválido o expirado');
    return await response.json();
}