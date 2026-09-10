import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@gigabyte-cashback/ui/styles.css";
import { App } from "./App";
import { LocaleProvider } from "./i18n";
import "./admin.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
);
