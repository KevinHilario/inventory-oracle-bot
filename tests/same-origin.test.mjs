import { test } from "node:test";
import assert from "node:assert/strict";
import { isSameOrigin } from "../src/server/same-origin.server.ts";

const req = (headers, url = "http://internal:3000/api/supervisor") =>
  new Request(url, { method: "POST", headers });

test("acepta el mismo host aunque el proxy termine HTTPS", () => {
  assert.equal(
    isSameOrigin(req({ origin: "https://app.onrender.com", host: "app.onrender.com" })),
    true,
  );
});

test("usa x-forwarded-host cuando existe", () => {
  assert.equal(
    isSameOrigin(
      req({ origin: "https://app.onrender.com", host: "10.0.0.5:3000", "x-forwarded-host": "app.onrender.com" }),
    ),
    true,
  );
});

test("rechaza otro origen o la ausencia de Origin", () => {
  assert.equal(isSameOrigin(req({ origin: "https://evil.com", host: "app.onrender.com" })), false);
  assert.equal(isSameOrigin(req({ host: "app.onrender.com" })), false);
  assert.equal(isSameOrigin(req({ origin: "no es url", host: "app.onrender.com" })), false);
});
