import { Navigate } from "react-router-dom";
import AppNavbar from "@/shared/components/AppNavbar";

function ProtectedRoute({ children }) {
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (isLoggedIn !== "true") {
        return <Navigate to="/login" replace/>;
    }

    return (
        <>
            <AppNavbar />
            {children}
        </>
    );
}

export default ProtectedRoute;
