import { Routes, Route } from "react-router-dom";

import Landing from "../pages/Landing/Landing";

import Construleads from "../pages/App/Construleads";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/construleads"
        element={<Construleads />}
      />
    </Routes>
  );
}