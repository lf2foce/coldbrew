import assert from "node:assert/strict";
import { test } from "node:test";

const { backendUrl } = await import("../backend.ts");

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("production thiếu BACKEND_URL thì báo lỗi rõ, không rơi âm thầm về localhost", () => {
  withEnv({ BACKEND_URL: undefined, NODE_ENV: "production" }, () => {
    assert.throws(() => backendUrl(), /BACKEND_URL/);
  });
});

test("dev thiếu BACKEND_URL dùng localhost; có thì bỏ dấu / cuối", () => {
  withEnv({ BACKEND_URL: undefined, NODE_ENV: "development" }, () => {
    assert.equal(backendUrl(), "http://localhost:8000");
  });
  withEnv({ BACKEND_URL: "https://phenau-v3.onrender.com/", NODE_ENV: "production" }, () => {
    assert.equal(backendUrl(), "https://phenau-v3.onrender.com");
  });
});
