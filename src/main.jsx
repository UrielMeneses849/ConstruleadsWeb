import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import { ChakraProvider } from "@chakra-ui/react";

import App from "./App";
import "./index.css";

import { system } from "./theme";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
   <BrowserRouter basename="/ConstruleadsWeb">
      <ChakraProvider value={system}>
        <App />
      </ChakraProvider>
    </BrowserRouter>
  </React.StrictMode>
);