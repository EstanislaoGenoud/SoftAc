import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import schoolsData from "./data/schools";
import EditSchool from "./pages/EditSchool";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/login";
import Schools from "./pages/schools";
import SchoolDashboard from "./pages/SchoolDashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import CreateSchool from "./pages/CreateSchool";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function App() {

  const [schools, setSchools] = useState(schoolsData);

  function handleCreateSchool(newSchool) {
    setSchools((currentSchools) => [
      ...currentSchools,
      newSchool
    ]);
  }

  function handleUpdateSchool(updatedSchool) {
    setSchools((currentSchools) =>
      currentSchools.map((school) =>
        school.id === updatedSchool.id
          ? updatedSchool
          : school
      )
    );
  }

  function handleDeleteSchool(schoolId) {
    setSchools((currentSchools) =>
      currentSchools.filter(
        (school) => school.id !== schoolId
      )
    );
  }

  return (
    <BrowserRouter>

      <Routes>

        {/* RUTAS PÚBLICAS */}

        <Route path="/login" element={<Login />} />

        <Route path="/recuperar-contrasena" element={<ForgotPassword />} />

        <Route path="/restablecer-contrasena" element={<ResetPassword />} />


        {/* RUTAS PROTEGIDAS */}

        <Route path="/escuelas" element={<ProtectedRoute>  <Schools schools={schools}
          onDeleteSchool={handleDeleteSchool} />
        </ProtectedRoute>
        }
        />

        <Route path="/escuelas/nueva" element={<ProtectedRoute> <CreateSchool
          onCreateSchool={handleCreateSchool}
        />
        </ProtectedRoute>
        }
        />

        <Route path="/escuelas/:id/editar" element={<ProtectedRoute> <EditSchool
          onUpdateSchool={handleUpdateSchool}
        />
        </ProtectedRoute>
        }
        />

        <Route path="/escuelas/:id" element={<ProtectedRoute> <SchoolDashboard />
        </ProtectedRoute>
        }
        />

        <Route path="/escuelas/:id/cursos" element={<ProtectedRoute> <Courses />
        </ProtectedRoute>
        }
        />

        <Route path="/escuelas/:id/cursos/:courseId" element={<ProtectedRoute>
          <CourseDetail />
        </ProtectedRoute>
        }
        />

        <Route path="/escuelas/:id/cursos/:courseId/alumnos" element={<ProtectedRoute>
          <Students />
        </ProtectedRoute>
        }
        />

        <Route path="/escuelas/:id/cursos/:courseId/asistencia" element={<ProtectedRoute>
          <Attendance />
        </ProtectedRoute>
        }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;