import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@gigabyte-cashback/ui/styles.css";
import { App } from "./App";
import { LocaleProvider } from "./i18n";
import "./admin.css";

const ReferenceAdminApp = lazy(() =>
  import("./ReferenceAdminApp").then(module => ({ default: module.ReferenceAdminApp })),
);
const referenceRoute = /\/(?:admin\/)?reference(?:\/|$)/.test(window.location.pathname);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleProvider>
      {referenceRoute ? <Suspense fallback={<p className="skeleton" role="status">Loading promotion portal…</p>}><ReferenceAdminApp /></Suspense> : <App />}
    </LocaleProvider>
  </StrictMode>,
);
