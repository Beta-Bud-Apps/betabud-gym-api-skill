# Beta Bud Gym API skill

A [Claude Code](https://claude.com/claude-code) plugin with one skill for the Beta Bud Gym API. The repository also holds a desktop extension for the Claude desktop app.

The skill teaches an agent to get a gym's own numbers from Beta Bud: sends, repeats, attempts, active climbers, grade agreement, climb quality, and setter feedback. It covers the token, the ten endpoints, the meaning of each number, the rate limits, and the privacy rules.

## Install

There are four ways to install. Use the first one that applies to you.

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

There are two choices. Use the desktop extension if you can.

**First choice: the desktop extension.**

[**Download the extension**](https://github.com/Beta-Bud-Apps/betabud-gym-api-skill/releases/latest/download/betabud-gym-api.mcpb)

1. Download `betabud-gym-api.mcpb`. The link always gives the file from the newest release.
2. Open the file. The app shows the install window.
3. Select **Install**.
4. Paste the API token of the gym. See [Use](#use) for how to get a token.

The app keeps the token in the keychain of the operating system. The extension gives the app ten tools, one for each endpoint of the API. The extension calls `betabud.app` from your computer, so the app does not block the calls.

**Second choice: the plugin from the marketplace.**

1. Open the plugin settings of the app.
2. Select **Add marketplace**.
3. Enter `Beta-Bud-Apps/betabud-gym-api-skill`.
4. Install the `betabud-gym-api` plugin from the `betabud` marketplace.

**Note:** With the plugin, the app can block calls to `betabud.app`. If a request fails, add `betabud.app` to the allowed domains of the app. As an alternative, use the desktop extension or Claude Code.

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
2. Give the token to the agent:
   - For the desktop extension, paste the token in the settings of the extension.
   - For the skill, put the token in an environment variable, for example `BETA_BUD_API_TOKEN`.
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
| `.github/workflows/release.yml` | The workflow that makes a release with the ZIP and the `.mcpb` file |
| `mcpb/manifest.json` | The manifest of the desktop extension |
| `mcpb/package.json`, `mcpb/package-lock.json` | The package of the MCP server and its dependencies |
| `mcpb/server/index.js` | The MCP server: the ten tools and the server instructions |
| `mcpb/server/api.js` | The function that calls the API and makes the error texts |
| `mcpb/test/api.test.js` | The tests for `api.js` |

To test the MCP server, run `npm install` and then `npm test` in `mcpb/`. The tests do not call the API.

## Release

A version tag starts the release workflow. The workflow does these steps:

1. It runs the tests of the MCP server.
2. It makes the ZIP from `skills/betabud-gym-api`.
3. It makes `betabud-gym-api.mcpb` from `mcpb/`, with the production dependencies.
4. It creates the GitHub Release, and attaches the ZIP and the `.mcpb` file.

To make a release:

1. Change `version` in `.claude-plugin/plugin.json`, `mcpb/manifest.json`, and `mcpb/package.json`. Merge the change into `main`.
2. Push a tag with the same version, for example `v1.1.0`.

The workflow stops if the tag and the three versions do not agree.

## Licence

Copyright Beta Bud. All rights reserved.
