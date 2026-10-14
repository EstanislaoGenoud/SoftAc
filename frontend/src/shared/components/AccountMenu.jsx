import { useEffect, useRef, useState } from "react";
import { LogoutIcon } from "./Icon";

function AccountMenu({ onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleDarkMode() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  // Inicializa el tema guardado
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  return (
    <div className="account-menu" ref={menuRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de cuenta"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "0.5rem 0.9rem",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-h)",
          boxShadow: "var(--shadow-soft)",
          font: "inherit",
          cursor: "pointer",
          letterSpacing: "2px",
        }}
      >
        ···
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "2.6rem",
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-soft)",
            minWidth: "170px",
            zIndex: 20,
            overflow: "hidden",
          }}
        >
          <button
            role="menuitem"
            onClick={toggleDarkMode}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.65rem 0.9rem",
              background: "transparent",
              border: "0",
              color: "var(--text-h)",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Modo oscuro
          </button>
          <button
            role="menuitem"
            onClick={onLogout}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.65rem 0.9rem",
              background: "transparent",
              border: "0",
              color: "var(--text-h)",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            <LogoutIcon /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
