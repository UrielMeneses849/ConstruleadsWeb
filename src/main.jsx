import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import { ChakraProvider } from "@chakra-ui/react";

import App from "./App";
import "./index.css";

import { system } from "./theme";

// Claves heredadas de prototipos anteriores que no deben persistir.
localStorage.removeItem("cl_admin_users");
localStorage.removeItem("cl_download_history");
localStorage.removeItem("cl_color_mode");
for (let index = localStorage.length - 1; index >= 0; index -= 1) {
  const key = localStorage.key(index);
  if (key?.startsWith("cl_suite_welcome_v1:")) localStorage.removeItem(key);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
   <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <ChakraProvider value={system}>
        <App />
      </ChakraProvider>
    </BrowserRouter>
  </React.StrictMode>
);
