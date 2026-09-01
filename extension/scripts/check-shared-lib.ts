import {
  formatJsonPath,
  isJsonMimeType,
  isPlainTextMimeType,
  looksLikeJsonText,
  parseResponseBody,
} from "../src/shared/lib";

const samples = [
  {
    name: "object",
    body: JSON.stringify({ data: { items: [{ email: "a@example.com" }] } }),
  },
  {
    name: "array",
    body: JSON.stringify([{ id: 1 }, { id: 2 }]),
  },
  {
    name: "primitive",
    body: JSON.stringify("hello"),
  },
  {
    name: "invalid",
    body: "{ bad json",
  },
  {
    name: "empty",
    body: "   ",
  },
];

for (const sample of samples) {
  const result = parseResponseBody(sample.body);

  console.log(sample.name, result.ok ? "ok" : result.error.type);
}

console.log("path", formatJsonPath(["data", "items", 0, "email"]));
console.log("weird path", formatJsonPath(["data", "items", 0, "user-email"]));
console.log("json mime", isJsonMimeType("application/vnd.api+json"));
console.log("plain mime", isPlainTextMimeType("text/plain; charset=utf-8"));
console.log("looks json", looksLikeJsonText('  { "ok": true }'));
console.log("looks not json", looksLikeJsonText("hello"));
