# Beta Bud Gym API skill

A [Claude Code](https://claude.com/claude-code) skill for the Beta Bud Gym API.

The skill teaches an agent to get a gym's own numbers from Beta Bud: sends, repeats, attempts, active climbers, grade agreement, climb quality, and setter feedback. It covers the token, the ten endpoints, the meaning of each number, the rate limits, and the privacy rules.

## Install

Personal, for every project:

```sh
git clone https://github.com/Beta-Bud-Apps/betabud-gym-api-skill.git
cp -r betabud-gym-api-skill/betabud-gym-api ~/.claude/skills/
```

One project:

```sh
cp -r betabud-gym-api-skill/betabud-gym-api .claude/skills/
```

Restart the session after the copy. To check the install, ask the agent for the number of sends at your gym today.

## Use

1. Ask an admin of the gym to open **Gym Settings → API Access** in Beta Bud, and to create a token. Beta Bud must turn the API on for the gym first.
2. Put the token in an environment variable, for example `BETA_BUD_API_TOKEN`.
3. Ask the agent for the number that you need.

The skill calls the API on its own. An example request:

```sh
curl -H "Authorization: Bearer $BETA_BUD_API_TOKEN" \
  "https://betabud.app/api/v1/gyms/1/activity-summary?from=2026-10-01&to=2026-10-08"
```

## The API

- Base URL: `https://betabud.app`
- Contract: [openapi/gym-api-v1.json](https://betabud.app/openapi/gym-api-v1.json)
- The API is read-only. Every endpoint uses `GET`.
- A token belongs to a gym admin. Only an admin of every location on a token can manage that token.
- Keep a token in a server or a script. Do not put a token in a web page.

## Files

| Path | Content |
| --- | --- |
| `betabud-gym-api/SKILL.md` | The skill |

## Licence

Copyright Beta Bud. All rights reserved.
