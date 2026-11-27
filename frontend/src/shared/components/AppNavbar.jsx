import { useLocation, useNavigate } from "react-router-dom";
import AccountMenu from "./AccountMenu";
import { ArrowLeftIcon } from "./Icon";
import "./AppNavbar.css";

function AppNavbar({ showAccountMenu = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathSegments = location.pathname.split("/");
  const parentPath = pathSegments.slice(0, -1).join("/") || "/";
  const courseListPath = pathSegments.slice(0, 4).join("/");
  const backPath = ["/recuperar-contrasena", "/restablecer-contrasena"].includes(
    location.pathname
  )
    ? "/login"
    : location.state?.backToCourses
      ? courseListPath
      : parentPath;
  const canGoBack = backPath !== "/";

  return (
    <nav className="app-navbar" aria-label="Navegación principal">
      <div className="app-navbar-content">
        {canGoBack && (
          <button
            type="button"
            className="app-navbar-back"
            onClick={() => navigate(
              backPath,
              location.state?.backToCourses
                ? { state: { courseModule: location.state.courseModule } }
                : undefined
            )}
          >
            <ArrowLeftIcon />
            <span>Volver</span>
          </button>
        )}
        <span className="app-navbar-brand">Gestión Académica</span>
        {showAccountMenu && <AccountMenu />}
      </div>
    </nav>
  );
}

export default AppNavbar;
