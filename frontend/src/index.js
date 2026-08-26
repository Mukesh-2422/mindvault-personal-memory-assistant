// Suppress Chrome extension runtime errors from crashing React dev overlay
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    if (event.filename && event.filename.startsWith("chrome-extension://")) {
      event.stopImmediatePropagation();
    }
  });
}

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
