import React from "react";
import ReactDOM from "react-dom/client";
import { JsonTreeCore } from "../shared/components";
import type { JsonValue } from "../shared/lib";

const sampleData: JsonValue = {
  data: {
    items: [
      {
        id: 1,
        email: "a@example.com",
        active: true,
        profile: {
          name: "Ada",
          role: "admin",
        },
      },
      {
        id: 2,
        email: "b@example.com",
        active: false,
        profile: null,
      },
    ],
  },
  meta: {
    page: 1,
    total: 2,
  },
};

function Panel() {
  return (
    <main style={{ minHeight: "100vh", margin: 0 }}>
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={2}
        onCopyPath={(path) => navigator.clipboard.writeText(path)}
        onCopyValue={(value) =>
          navigator.clipboard.writeText(JSON.stringify(value, null, 2))
        }
      />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Panel />
  </React.StrictMode>,
);
