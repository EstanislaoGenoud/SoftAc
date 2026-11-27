import { useEffect, useRef, useState } from "react";
import { LogoutIcon, MenuIcon } from "./Icon";
import { logout } from "@/modules/auth";
import { useNavigate } from "react-router-dom";

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function toggleDarkMode() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menú"
        onClick={() => setOpen((v) => !v)}
      >
        <MenuIcon />
      </button>

      {open && (
        <div className="account-menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={toggleDarkMode}
            className="account-menu-item"
          >
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="account-menu-item"
          >
            <LogoutIcon /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
