import React from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import "../app/prototype-v3.css";
import { CashbackPrototypeV3 } from "../app/prototype-v3";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CashbackPrototypeV3 />
  </React.StrictMode>,
);
