import assert from "node:assert/strict";
import { test } from "node:test";

const { authorizeUrl, backendApiUrl } = await import("../backend.ts");

// process.env.NODE_ENV bị @types/node khai readonly; test cần đổi qua lại.
const env = process.env as Record<string, string | undefined>;

function withEnv(values: { PHENAU_URL?: string; NODE_ENV: string }, fn: () => void) {
  const saved = { PHENAU_URL: env.PHENAU_URL, NODE_ENV: env.NODE_ENV };
  for (const [k, v] of Object.entries({ PHENAU_URL: values.PHENAU_URL, NODE_ENV: values.NODE_ENV })) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete env[k];
      else env[k] = v;
    }
  }
}

test("production không cần đặt URL nào: API và cổng đăng nhập đều là phenau.com", () => {
  withEnv({ NODE_ENV: "production" }, () => {
    assert.equal(backendApiUrl("/v1/conversations"), "https://phenau.com/api/py/v1/conversations");
    assert.equal(authorizeUrl().toString(), "https://phenau.com/coldbrew/authorize");
  });
});

test("local mặc định là frontend Phê Nâu :3000 (nó tự rewrite sang FastAPI :8000)", () => {
  withEnv({ NODE_ENV: "development" }, () => {
    assert.equal(backendApiUrl("/v1/users/me/principal"), "http://localhost:3000/api/py/v1/users/me/principal");
    assert.equal(authorizeUrl().toString(), "http://localhost:3000/coldbrew/authorize");
  });
});

test("PHENAU_URL đổi cả API lẫn cổng đăng nhập cùng lúc", () => {
  withEnv({ NODE_ENV: "production", PHENAU_URL: "https://staging.phenau.com/" }, () => {
    assert.equal(backendApiUrl("/v1/conversations"), "https://staging.phenau.com/api/py/v1/conversations");
    assert.equal(authorizeUrl().origin, "https://staging.phenau.com");
  });
});

test("PHENAU_URL kèm path hoặc sai định dạng bị báo lỗi rõ, không ghép thành 404", () => {
  withEnv({ NODE_ENV: "production", PHENAU_URL: "https://phenau.com/api/py" }, () => {
    assert.throws(() => backendApiUrl("/v1/conversations"), /chỉ là origin/);
  });
  withEnv({ NODE_ENV: "production", PHENAU_URL: "phenau.com" }, () => {
    assert.throws(() => backendApiUrl("/v1/conversations"), /không hợp lệ/);
  });
});

test("đường không theo dạng /v1/ bị từ chối", () => {
  withEnv({ NODE_ENV: "production" }, () => {
    assert.throws(() => backendApiUrl("/api/v1/conversations"), /\/v1\//);
  });
});
