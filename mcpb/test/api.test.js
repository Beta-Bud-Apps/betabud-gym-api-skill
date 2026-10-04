import assert from "node:assert/strict";
import { test } from "node:test";
import { callGymApi } from "../server/api.js";

const TOKEN = "bbk_test_secret_value";
const BASE_URL = "https://gym-api.test";

// A stub for `fetch`. It records each call and gives one fixed answer. It never uses the network.
function stubFetch({ status = 200, body = {}, headers = {} } = {}) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });
  };
  return { fetch, calls };
}

function apiError(code, message = "A message") {
  return { error: { code, message, requestId: "req-from-body" } };
}

test("a request goes to the correct URL and leaves out a parameter that is undefined", async () => {
  const { fetch, calls } = stubFetch();

  await callGymApi({
    path: "/api/v1/gyms/7/climbs",
    query: { limit: 20, cursor: undefined, lifecycle: "live", zoneId: undefined },
    token: TOKEN,
    baseUrl: BASE_URL,
    fetch,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://gym-api.test/api/v1/gyms/7/climbs?limit=20&lifecycle=live");
});

test("a request sends the bearer token", async () => {
  const { fetch, calls } = stubFetch();

  await callGymApi({ path: "/api/v1/gyms", token: TOKEN, baseUrl: BASE_URL, fetch });

  assert.equal(new Headers(calls[0].init.headers).get("authorization"), `Bearer ${TOKEN}`);
});

test("a good answer gives the body of the API without changes", async () => {
  const body = '{"data":[{"id":7,"average":null}],"pagination":{"nextCursor":null}}';
  const { fetch } = stubFetch({ body });

  const result = await callGymApi({ path: "/api/v1/gyms", token: TOKEN, baseUrl: BASE_URL, fetch });

  assert.deepEqual(result, { ok: true, text: body });
});

test("an empty token gives the settings error, and the API gets no call", async () => {
  for (const token of [undefined, "", "   "]) {
    const { fetch, calls } = stubFetch();

    const result = await callGymApi({ path: "/api/v1/gyms", token, baseUrl: BASE_URL, fetch });

    assert.equal(result.ok, false);
    assert.match(result.text, /token is not set/);
    assert.match(result.text, /settings of the Beta Bud Gym API extension/);
    assert.equal(calls.length, 0);
  }
});

test("a 401 tells the user to make a new token", async () => {
  const { fetch } = stubFetch({
    status: 401,
    body: apiError("unauthorized"),
    headers: { "x-request-id": "req-401" },
  });

  const result = await callGymApi({ path: "/api/v1/gyms", token: TOKEN, baseUrl: BASE_URL, fetch });

  assert.equal(result.ok, false);
  assert.match(result.text, /401/);
  assert.match(result.text, /unauthorized/);
  assert.match(result.text, /Do not send the same token again/);
  assert.match(result.text, /Make a new token/);
  assert.match(result.text, /req-401/);
});

test("a 403 gym_api_disabled tells the user to ask Beta Bud", async () => {
  const { fetch } = stubFetch({ status: 403, body: apiError("gym_api_disabled") });

  const result = await callGymApi({ path: "/api/v1/gyms/7", token: TOKEN, baseUrl: BASE_URL, fetch });

  assert.equal(result.ok, false);
  assert.match(result.text, /403/);
  assert.match(result.text, /gym_api_disabled/);
  assert.match(result.text, /Ask Beta Bud to turn the API on/);
  assert.match(result.text, /Do not write zeros/);
});

test("a 403 gym_forbidden says that the token does not cover the gym", async () => {
  const { fetch } = stubFetch({ status: 403, body: apiError("gym_forbidden") });

  const result = await callGymApi({ path: "/api/v1/gyms/8", token: TOKEN, baseUrl: BASE_URL, fetch });

  assert.match(result.text, /gym_forbidden/);
  assert.match(result.text, /does not cover this gym/);
  assert.doesNotMatch(result.text, /Ask Beta Bud to turn the API on/);
});

test("a 429 gives the Retry-After value", async () => {
  const { fetch } = stubFetch({
    status: 429,
    body: apiError("rate_limited"),
    headers: { "retry-after": "37" },
  });

  const result = await callGymApi({ path: "/api/v1/gyms/7/climb-stats", token: TOKEN, baseUrl: BASE_URL, fetch });

  assert.equal(result.ok, false);
  assert.match(result.text, /429/);
  assert.match(result.text, /Retry-After: 37 seconds/);
});

test("a 503 query_timeout tells the user to use a shorter window", async () => {
  const { fetch } = stubFetch({ status: 503, body: apiError("query_timeout") });

  const result = await callGymApi({ path: "/api/v1/gyms/7/climb-stats", token: TOKEN, baseUrl: BASE_URL, fetch });

  assert.equal(result.ok, false);
  assert.match(result.text, /503/);
  assert.match(result.text, /query_timeout/);
  assert.match(result.text, /shorter window/);
});

test("an error body that is not JSON gives the status", async () => {
  const { fetch } = stubFetch({ status: 502, body: "<html>Bad Gateway</html>" });

  const result = await callGymApi({ path: "/api/v1/gyms", token: TOKEN, baseUrl: BASE_URL, fetch });

  assert.equal(result.ok, false);
  assert.match(result.text, /502/);
});

test("a request does not go out a second time after a failure", async () => {
  const { fetch, calls } = stubFetch({ status: 503, body: apiError("query_timeout") });

  await callGymApi({ path: "/api/v1/gyms/7/climb-stats", token: TOKEN, baseUrl: BASE_URL, fetch });

  assert.equal(calls.length, 1);
});

test("an error text never contains the token", async () => {
  const answers = [
    { status: 401, body: apiError("unauthorized", `The token ${TOKEN} is not recognised`) },
    { status: 403, body: apiError("gym_forbidden") },
    { status: 429, body: apiError("rate_limited"), headers: { "retry-after": "5" } },
    { status: 503, body: apiError("query_timeout") },
    { status: 500, body: "not JSON" },
  ];
  for (const answer of answers) {
    const { fetch } = stubFetch(answer);
    const result = await callGymApi({ path: "/api/v1/gyms", token: TOKEN, baseUrl: BASE_URL, fetch });
    assert.equal(result.text.includes(TOKEN), false, `status ${answer.status}`);
  }

  const failedFetch = async () => {
    throw new Error(`connect failed for Bearer ${TOKEN}`);
  };
  const result = await callGymApi({ path: "/api/v1/gyms", token: TOKEN, baseUrl: BASE_URL, fetch: failedFetch });
  assert.equal(result.ok, false);
  assert.equal(result.text.includes(TOKEN), false);
});
