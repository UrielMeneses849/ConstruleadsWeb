import { Navigate, Routes, Route, useLocation } from "react-router-dom";

import Landing from "../pages/Landing/Landing";
import Construleads from "../pages/App/Construleads";
import Perfil from "../pages/App/Perfil";
import Beneficios from "../pages/Landing/Beneficios/Beneficios";
import Audiencia from "../pages/Landing/Audiencia/Audiencia";

function PersistentConstruleads() {
  const location = useLocation();
  const showsProfile = location.pathname.endsWith('/perfil');

  return (
    <>
      <div style={{ display: showsProfile ? 'none' : 'block' }}>
        <Construleads />
      </div>
      {showsProfile && <Perfil />}
    </>
  );
}

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

      <Route path="/construleads/*" element={<PersistentConstruleads />} />

      <Route
        path="/perfil"
        element={<Navigate to="/construleads/perfil" replace />}
      />
    </Routes>
  );
}
