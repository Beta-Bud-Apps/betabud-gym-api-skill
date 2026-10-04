# Beta Bud Gym API skill

A [Claude Code](https://claude.com/claude-code) plugin with one skill for the Beta Bud Gym API.

The skill teaches an agent to get a gym's own numbers from Beta Bud: sends, repeats, attempts, active climbers, grade agreement, climb quality, and setter feedback. It covers the token, the ten endpoints, the meaning of each number, the rate limits, and the privacy rules.

## Install

There are four ways to install the skill. Use the first one that applies to you.

### Claude Code plugin

Run these two commands in a Claude Code session:

```
/plugin marketplace add Beta-Bud-Apps/betabud-gym-api-skill
/plugin install betabud-gym-api@betabud
```

From a terminal, the same commands are:

```sh
claude plugin marketplace add Beta-Bud-Apps/betabud-gym-api-skill
claude plugin install betabud-gym-api@betabud
```

### Claude desktop app

1. Open the plugin settings of the app.
2. Select **Add marketplace**.
3. Enter `Beta-Bud-Apps/betabud-gym-api-skill`.
4. Install the `betabud-gym-api` plugin from the `betabud` marketplace.

**Note:** The app can block calls to `betabud.app`. If a request fails, add `betabud.app` to the allowed domains of the app. As an alternative, use Claude Code.

### Download the ZIP

[**Download the skill**](https://github.com/Beta-Bud-Apps/betabud-gym-api-skill/releases/latest/download/betabud-gym-api.zip)

The link always gives the ZIP from the newest release. Use the ZIP in one of these two ways:

- In the Claude app, open the skill settings and upload the ZIP.
- For Claude Code, extract the ZIP and move the `betabud-gym-api` folder into `~/.claude/skills/`.

### Manual copy

Personal, for every project:

```sh
git clone https://github.com/Beta-Bud-Apps/betabud-gym-api-skill.git
cp -r betabud-gym-api-skill/skills/betabud-gym-api ~/.claude/skills/
```

One project:

```sh
cp -r betabud-gym-api-skill/skills/betabud-gym-api .claude/skills/
```

Restart the session after the install. To check the install, ask the agent for the number of sends at your gym today.

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
| `skills/betabud-gym-api/SKILL.md` | The skill |
| `.claude-plugin/plugin.json` | The plugin manifest |
| `.claude-plugin/marketplace.json` | The `betabud` marketplace, which lists the plugin |
| `.github/workflows/release.yml` | The workflow that makes a release with the ZIP |

## Release

A version tag starts the release workflow. The workflow makes the ZIP from `skills/betabud-gym-api`, creates the GitHub Release, and attaches the ZIP.

1. Change `version` in `.claude-plugin/plugin.json`, and merge the change into `main`.
2. Push a tag with the same version, for example `v1.0.1`.

The workflow stops if the tag and the plugin version do not agree.

## Licence

Copyright Beta Bud. All rights reserved.
