import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@/lib/i18n";
import { router } from "@/routes/router";
import { AuthProvider } from "@/features/auth/AuthProvider";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found in index.html");

createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
