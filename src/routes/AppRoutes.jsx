import { Navigate, Routes, Route } from "react-router-dom";

import Landing from "../pages/Landing/Landing";
import Construleads from "../pages/App/Construleads";
import Perfil from "../pages/App/Perfil";
import Beneficios from "../pages/Landing/Beneficios/Beneficios";
import Audiencia from "../pages/Landing/Audiencia/Audiencia";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route
        path="/beneficios"
        element={<Beneficios />}
      />

        <Route
        path="/audiencia"
        element={<Audiencia />}
      />

      <Route
        path="/construleads"
        element={<Construleads />}
      />

      <Route
        path="/construleads/perfil"
        element={<Perfil />}
      />

      <Route
        path="/perfil"
        element={<Navigate to="/construleads/perfil" replace />}
      />
    </Routes>
  );
}
