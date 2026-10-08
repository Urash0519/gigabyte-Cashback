import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@gigabyte-cashback/ui/styles.css";
import { App } from "./App";
import { LocaleProvider } from "./i18n";

const ReferenceApp = lazy(() => import("./ReferenceApp"));
const isReference = /^\/reference(?:\/|$)/.test(window.location.pathname);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleProvider>
      {isReference ? (
        <Suspense fallback={<p role="status">Loading promotion…</p>}>
          <ReferenceApp />
        </Suspense>
      ) : <App />}
    </LocaleProvider>
  </StrictMode>,
);
