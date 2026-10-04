const DEFAULT_BASE_URL = "https://betabud.app";

const NO_TOKEN_TEXT =
  "The API token is not set. Open the settings of the Beta Bud Gym API extension and paste the token. " +
  "A gym admin makes the token in Beta Bud, in Gym Settings, API Access.";

// What the user must do for each failure. A key is the status and the error code, or the status only.
const ADVICE = {
  401:
    "The token is not valid, or an admin revoked it. Do not send the same token again. " +
    "Make a new token in Gym Settings, API Access. Then paste it in the settings of the extension.",
  "403 gym_forbidden": "The token does not cover this gym. Call list_gyms to see the gyms that the token covers.",
  "403 gym_api_disabled": "The API is off for this gym. Ask Beta Bud to turn the API on for the gym.",
  429: "No more requests are available in this minute. Wait for the Retry-After time, then send the request again.",
  "503 query_timeout": "The query took more than 8 seconds. Use a shorter window of dates.",
};

/**
 * Sends one GET request to the Beta Bud Gym API.
 * The result is `{ ok: true, text }` with the body of the API, or `{ ok: false, text }` with an error text.
 * The function does not throw, does not retry, and never puts the token in a text.
 */
export async function callGymApi({
  path,
  query = {},
  token,
  // BETA_BUD_API_URL is for local tests only.
  baseUrl = process.env.BETA_BUD_API_URL || DEFAULT_BASE_URL,
  fetch = globalThis.fetch,
}) {
  if (!token || token.trim() === "") {
    return { ok: false, text: NO_TOKEN_TEXT };
  }

  const bearerToken = token.trim();
  // An error message from the network or from the API can repeat the token. Remove it from each error text.
  const withoutToken = (text) => text.replaceAll(bearerToken, "[token]");

  const url = new URL(path, baseUrl);
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(name, String(value));
    }
  }

  let response;
  let body;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}`, Accept: "application/json" },
    });
    body = await response.text();
  } catch (error) {
    return {
      ok: false,
      text: withoutToken(
        `The request to the Beta Bud API did not complete: ${error.message}. Show this failure to the user. Do not write zeros.`
      ),
    };
  }

  if (response.ok) {
    return { ok: true, text: body };
  }

  // An error body is `{ error: { code, message, requestId, details } }`. A proxy can send a body that is not JSON.
  let apiError = {};
  try {
    apiError = JSON.parse(body).error ?? {};
  } catch {
    // Keep the empty object.
  }

  const code = apiError.code ?? "unknown";
  const lines = [`The Beta Bud API gave the status ${response.status} with the error code ${code}.`];
  if (apiError.message) {
    lines.push(`Message from the API: ${apiError.message}`);
  }
  for (const detail of apiError.details ?? []) {
    lines.push(`Parameter ${detail.parameter}: ${detail.message}`);
  }
  const advice = ADVICE[`${response.status} ${code}`] ?? ADVICE[response.status];
  if (advice) {
    lines.push(advice);
  }
  const retryAfter = response.headers.get("retry-after");
  if (response.status === 429 && retryAfter) {
    lines.push(`Retry-After: ${retryAfter} seconds.`);
  }
  const requestId = response.headers.get("x-request-id") ?? apiError.requestId;
  if (requestId) {
    lines.push(`Request id (x-request-id): ${requestId}. Give this id to Beta Bud when you report the problem.`);
  }
  lines.push("Show this failure to the user. Do not write zeros.");

  return { ok: false, text: withoutToken(lines.join("\n")) };
}
