import React from "react";
import ReactDOM from "react-dom/client";

function Panel() {
  return <main>JSON Lens DevTools Panel</main>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Panel />
  </React.StrictMode>,
);
