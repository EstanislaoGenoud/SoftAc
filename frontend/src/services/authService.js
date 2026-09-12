export function login(email, password) {
    return {
        email,
        password
    };
}

export function logout() {
    localStorage.removeItem("isLoggedIn");
}

export function isAuthenticated() {
    return localStorage.getItem("isLoggedIn") === "true";
}