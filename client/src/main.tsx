import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BasicApp from "./BasicApp";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <BasicApp />
  </StrictMode>
);
