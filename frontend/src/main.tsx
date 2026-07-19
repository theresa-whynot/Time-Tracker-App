import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { FloatingTimerWidget } from "./components/FloatingTimerWidget";
import "./styles.css";

const isWidgetView = new URLSearchParams(window.location.search).get("view") === "widget";
if (isWidgetView) {
  document.body.classList.add("widget-body");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isWidgetView ? <FloatingTimerWidget /> : <App />}
  </React.StrictMode>,
);
