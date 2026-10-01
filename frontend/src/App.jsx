import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { 
  Login, 
  ForgotPassword, 
  ResetPassword, 
  ProtectedRoute 
} from "@/modules/auth";

import { 
  Schools, 
  CreateSchool, 
  EditSchool, 
  SchoolDashboard, 
  schoolsData 
} from "@/modules/escuelas";

import { 
  Courses, 
  CreateCourse, 
  CourseDetail 
} from "@/modules/cursos";

import { 
  Students, 
  StudentProfile 
} from "@/modules/alumnos";

import { 
  Attendance 
} from "@/modules/asistencias";

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

        {/* REDIRECCIÓN POR DEFECTO */}
        <Route path="/" element={<Navigate to="/escuelas" replace />} />

        {/* RUTAS PÚBLICAS */}

        <Route path="/login" element={<Login />} />

        <Route path="/recuperar-contrasena" element={<ForgotPassword />} />

        <Route path="/restablecer-contrasena" element={<ResetPassword />} />


        {/* RUTAS PROTEGIDAS */}

        <Route path="/escuelas" element={
          <ProtectedRoute>
            <Schools schools={schools} onDeleteSchool={handleDeleteSchool} />
          </ProtectedRoute>
        } />

        <Route path="/escuelas/nueva" element={
          <ProtectedRoute>
            <CreateSchool onCreateSchool={handleCreateSchool} />
          </ProtectedRoute>
        } />

        <Route path="/escuelas/:id/editar" element={
          <ProtectedRoute>
            <EditSchool onUpdateSchool={handleUpdateSchool} />
          </ProtectedRoute>
        } />

        <Route path="/escuelas/:id" element={
          <ProtectedRoute>
            <SchoolDashboard />
          </ProtectedRoute>
        } />

        <Route path="/escuelas/:id/cursos" element={
          <ProtectedRoute>
            <Courses />
          </ProtectedRoute>
        } />

        <Route path="/escuelas/:id/cursos/nuevo" element={
          <ProtectedRoute>
            <CreateCourse />
          </ProtectedRoute>
        } />

        <Route path="/escuelas/:id/cursos/:courseId" element={
          <ProtectedRoute>
            <CourseDetail />
          </ProtectedRoute>
        } />

        <Route path="/escuelas/:id/cursos/:courseId/alumnos" element={
          <ProtectedRoute>
            <Students />
          </ProtectedRoute>
        } />

        <Route path="/escuelas/:id/cursos/:courseId/alumnos/:studentId" element={
          <ProtectedRoute>
            <StudentProfile />
          </ProtectedRoute>
        } />

        <Route path="/escuelas/:id/cursos/:courseId/asistencia" element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        } />

      </Routes>

    </BrowserRouter>
  );
}

export default App;