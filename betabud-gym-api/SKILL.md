---
name: betabud-gym-api
description: Get a climbing gym's own statistics from the Beta Bud Gym API. Use when a gym asks for its Beta Bud numbers (sends, repeats, attempts, active climbers, grade agreement, climb quality, setter feedback), or asks how to connect a script, dashboard or spreadsheet to Beta Bud, how to make or use an API token, or how to read the OpenAPI contract.
---

# Beta Bud Gym API

A read-only reporting API. It gives one gym, or a chain of gyms, its own numbers from Beta Bud. Every endpoint uses `GET`.

- Base URL `https://betabud.app`
- Contract `https://betabud.app/openapi/gym-api-v1.json`

## 1. Get a token

A gym admin makes the token:

1. Open **Gym Settings** in Beta Bud.
2. Go to **API Access**.
3. Type a name, select the locations, then select **Create token**.
4. Copy the token and keep it safe.

Beta Bud turns the API on for each gym. If **API Access** is not in Gym Settings, ask Beta Bud.

Only an admin makes a token. A setter cannot. Keep the token in an environment variable, for example `BETA_BUD_API_TOKEN`. Call the API from a server or a script. A web page lets every visitor read the token.

Done when: a token that starts with `bbk_` is in hand, and the gym shows **API Access**.

## 2. Make the first call

```sh
curl -H "Authorization: Bearer $BETA_BUD_API_TOKEN" \
  "https://betabud.app/api/v1/gyms"
```

The answer gives each gym that the token covers, with its id and its timezone. Every other endpoint needs the gym id.

Done when: a `200` answer gives the gym id.

## 3. Choose the endpoint

| Question | Request |
| --- | --- |
| Which gyms does the token cover? | `GET /api/v1/gyms` |
| What is the gym, and what is its timezone? | `GET /api/v1/gyms/{gymId}` |
| Which zones exist? | `GET /api/v1/gyms/{gymId}/zones` |
| Which grades exist, and in what order? | `GET /api/v1/gyms/{gymId}/grades` |
| Which climbs exist? | `GET /api/v1/gyms/{gymId}/climbs` |
| What is one climb? | `GET /api/v1/gyms/{gymId}/climbs/{climbId}` |
| How do climbers rate one climb? | `GET /api/v1/gyms/{gymId}/climbs/{climbId}/stats` |
| How do climbers rate every climb? | `GET /api/v1/gyms/{gymId}/climb-stats` |
| How much activity is on each day? | `GET /api/v1/gyms/{gymId}/activity-summary?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| What do climbers tell the setters? | `GET /api/v1/gyms/{gymId}/setter-feedback` |

`/gyms`, `/zones`, `/climbs`, `/climb-stats` and `/setter-feedback` take `limit` and `cursor`. The default `limit` is 50, and the maximum is 100. For the next page, send the same request with `cursor` set to `nextCursor`. A `null` cursor means the list is complete.

## 4. Read the numbers

Every climb row has two parts. `retainedOpinions` holds the opinions that exist now. The dates do not change it. `activity` holds the counters, and the dates do change it.

| Field | Meaning |
| --- | --- |
| `sends` | Confirmed sends. A project that the climber did not send is not a send. |
| `repeats` | Repeats of a climb that the climber sent before. |
| `attempts` | Recorded attempts. |
| `activePeople` | The different people who recorded a send, a repeat or an attempt on that local date. One person counts one time for each date. |

A quality opinion is `BAD`, `OK`, `NEUTRAL`, `GOOD` or `LOVE`, and the average uses the scale 1 to 5. Always show `responses` with `average`, because an average from one or two answers is weak evidence.

A grade opinion has two types. `directional` counts `easier`, `agree` and `harder`. `suggested` counts the grades that climbers voted for. The API keeps the two types apart.

## 5. Dates, limits and errors

**Dates.** `from` is inclusive and `to` is exclusive. The window is at most 90 days on `/activity-summary` and `/climb-stats`. A local date is `YYYY-MM-DD` in the timezone of the gym, and `activity-summary` puts each event on a local date. A time is an ISO 8601 text in UTC.

**Limits.** `/gyms` allows 60 requests each minute for each token. Gym data allows 60 requests each minute, shared by all tokens of one gym. Statistics allow 10 requests each minute, shared by all tokens of one gym. A `429` answer has a `Retry-After` header. Wait for that time.

**Errors.** A `401` means a bad or revoked token. Do not send the same token again. A `403 gym_forbidden` means the token does not cover the gym. A `403 gym_api_disabled` means Beta Bud turned the API off for the gym. Show the failure. Do not write zeros. A `503 query_timeout` means the query took more than 8 seconds, so use a shorter window. Give the `x-request-id` header to Beta Bud when you report a problem.

**Values.** A value that does not exist is `null`. Keep `null` as `null`, and do not change it to zero. Version 1 can add new fields, so ignore a field that you do not know.

**Changes.** A count for a past date can change. A climber can record a climb later, change a record, or delete an account. Get a past window again when you need the current numbers.

## 6. Privacy

The API gives no names, email addresses, user ids, pictures or profile links of climbers. It gives no name of a setter. It gives no sends, attempts or repeats of one person. It gives the activity of the gym, not of a person.

A count for a small group, or a free text comment, can point to one person. Treat setter feedback as sensitive.

Activity is Beta Bud activity. It counts what climbers record in the app. It is not attendance, visits or occupancy.
