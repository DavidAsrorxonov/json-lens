import React from "react";
import ReactDOM from "react-dom/client";

export function Popup() {
  return <main>JSON Lens</main>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
