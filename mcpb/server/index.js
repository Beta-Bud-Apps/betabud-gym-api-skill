#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { callGymApi } from "./api.js";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const INSTRUCTIONS = `The Beta Bud Gym API is a read-only API. It gives a climbing gym its own numbers from Beta Bud.

Start:
- Call list_gyms first. It gives the id and the timezone of each gym that the token covers. Every other tool needs the gym id.

Dates:
- A local date is YYYY-MM-DD in the timezone of the gym. A time is an ISO 8601 text in UTC.
- "from" is inclusive and "to" is exclusive. A window is at most 90 days on get_activity_summary, list_climb_stats, and get_climb_stats.
- A count for a past date can change. Get a past window again when you need the current numbers.

Pages:
- A list tool takes "limit" and "cursor". For the next page, send the same request with "cursor" set to pagination.nextCursor.
- A null nextCursor means that the list is complete.

Numbers:
- sends: confirmed sends. A project that the climber did not send is not a send.
- repeats: repeats of a climb that the climber sent before.
- attempts: recorded attempts.
- activePeople: the different people who recorded a send, a repeat, or an attempt on that local date. One person counts one time for each date. Do not add activePeople across dates or gyms.
- retainedOpinions holds the opinions that exist now. The dates do not change it. activity holds the counters, and the dates do change it.
- A quality opinion is BAD, OK, NEUTRAL, GOOD, or LOVE. The average uses the scale 1 to 5.
- Always show "responses" with "average". An average from one or two answers is weak evidence.
- A grade opinion has two types. "directional" counts easier, agree, and harder. "suggested" counts the grades that climbers voted for. Keep the two types apart.
- A value that does not exist is null. Keep null as null. Do not change it to zero.

Failures:
- When a tool gives an error, show the failure to the user. Do not write zeros.
- Do not send a request again after a 401 error.
- After a 429 error, wait for the Retry-After time.

Privacy:
- The API gives no names, email addresses, user ids, pictures, or profile links of climbers. It gives no name of a setter.
- The API gives the activity of the gym, not of one person.
- A count for a small group, or a free text comment, can point to one person. Treat setter feedback as sensitive.
- Activity is Beta Bud activity. It counts what climbers record in the app. It is not attendance, visits, or occupancy.`;

// The parameter schemas follow the contract at https://betabud.app/openapi/gym-api-v1.json.
const idPattern = /^[A-Za-z0-9_-]{1,64}$/;
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD");

const gymId = z.number().int().min(0).max(999999999).describe("The id of the gym. Read it from list_gyms.");
const climbId = z.string().regex(idPattern).describe("The id of a climb. Read it from list_climbs.");
const limit = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe("The largest number of items in one page. The default is 50.");
const cursor = z
  .string()
  .min(1)
  .max(512)
  .optional()
  .describe("The value of pagination.nextCursor from the previous page. Send it with the same other parameters.");
const from = localDate.describe("The first local date of the window, in the timezone of the gym. The window includes this date.");
const to = localDate.describe("The end of the window, in the timezone of the gym. The window does not include this date.");
const mode = z.enum(["BOULDERS", "ROUTES"]).optional();
const lifecycle = z
  .enum(["live", "archived", "not_live"])
  .optional()
  .describe(
    "Return only the climbs in one lifecycle state. A live climb is on the wall. An archived climb is not live and has an archive date. A not_live climb is not live and has no archive date."
  );
const type = z.enum(["BOULDER", "ROUTE"]).optional().describe("Return only the climbs of one type.");
const zoneId = z.string().regex(idPattern).optional().describe("Return only the climbs in the zone with this id. Read it from list_zones.");

const CURSOR_RULE = "For the next page, send the same request with cursor set to pagination.nextCursor. A null nextCursor means that the list is complete.";
const WINDOW_RULE = "from is inclusive and to is exclusive. Send both from and to, or neither. A window is at most 90 days.";
const STATS_RULE =
  "retainedOpinions holds every opinion that exists now, and the dates do not change it. activity counts the events in the window, or all events with no window. A null average means that no climber gave an opinion. Always show responses with average.";

// Each tool is one GET endpoint. The parameters that are not in the path go in the query.
const tools = [
  {
    name: "list_gyms",
    title: "List the gyms of the token",
    description: `Which gyms does the token cover? Gives the id and the timezone of each gym. Call this tool first, because every other tool needs the gym id. ${CURSOR_RULE}`,
    inputSchema: { limit, cursor },
    path: () => "/api/v1/gyms",
  },
  {
    name: "get_gym",
    title: "Get one gym",
    description: "What is the gym, and what is its timezone? Gives one gym that the token covers.",
    inputSchema: { gymId },
    path: (args) => `/api/v1/gyms/${args.gymId}`,
  },
  {
    name: "list_zones",
    title: "List the zones of a gym",
    description: `Which zones exist? A zone is a named area of the gym. ${CURSOR_RULE}`,
    inputSchema: { gymId, limit, cursor, mode: mode.describe("Return only the zones of one mode.") },
    path: (args) => `/api/v1/gyms/${args.gymId}/zones`,
  },
  {
    name: "list_grade_systems",
    title: "List the grade systems of a gym",
    description:
      "Which grades exist, and in what order? Gives the grade systems of the gym, with the grades in ascending order of sortOrder. The list is always one page, so do not send a cursor.",
    inputSchema: { gymId, limit, cursor },
    path: (args) => `/api/v1/gyms/${args.gymId}/grades`,
  },
  {
    name: "list_climbs",
    title: "List the climbs of a gym",
    description: `Which climbs exist? Gives the climbs in every lifecycle state unless the lifecycle filter limits the list. The API does not give the name of a setter. ${CURSOR_RULE}`,
    inputSchema: { gymId, limit, cursor, lifecycle, type, zoneId },
    path: (args) => `/api/v1/gyms/${args.gymId}/climbs`,
  },
  {
    name: "get_climb",
    title: "Get one climb",
    description: "What is one climb? Gives one climb of the gym. A climb of a different gym gives the error not_found.",
    inputSchema: { gymId, climbId },
    path: (args) => `/api/v1/gyms/${args.gymId}/climbs/${args.climbId}`,
  },
  {
    name: "get_climb_stats",
    title: "Get the statistics of one climb",
    description: `How do climbers rate one climb? Gives the grade opinions, the quality opinions, and the counts of sends, repeats, and attempts for one climb. ${STATS_RULE} ${WINDOW_RULE}`,
    inputSchema: { gymId, climbId, from: from.optional(), to: to.optional() },
    path: (args) => `/api/v1/gyms/${args.gymId}/climbs/${args.climbId}/stats`,
  },
  {
    name: "list_climb_stats",
    title: "List the statistics of the climbs of a gym",
    description: `How do climbers rate every climb? Gives one statistics row for each climb: grade opinions, quality opinions, and counts of sends, repeats, and attempts. ${STATS_RULE} ${WINDOW_RULE} ${CURSOR_RULE}`,
    inputSchema: { gymId, limit, cursor, from: from.optional(), to: to.optional(), lifecycle, type, zoneId },
    path: (args) => `/api/v1/gyms/${args.gymId}/climb-stats`,
  },
  {
    name: "get_activity_summary",
    title: "Get the daily activity of a gym",
    description:
      "How much activity is on each day? Gives sends, repeats, attempts, and activePeople for each local date from from up to to. from is inclusive and to is exclusive. A window is at most 90 days. The count is Beta Bud activity, not attendance or occupancy. Do not add activePeople across dates or gyms, because one person can be active on more than one date.",
    inputSchema: { gymId, from, to, mode: mode.describe("Count only the climbs of one mode. The default is both modes.") },
    path: (args) => `/api/v1/gyms/${args.gymId}/activity-summary`,
  },
  {
    name: "list_setter_feedback",
    title: "List the feedback that reaches the setters",
    description: `What do climbers tell the setters? Gives the comments that reach the setters of the gym. A reply in data comes with its parent in includedParents. A parent gives context and is not new feedback, so remove repeats by id. from is inclusive and to is exclusive. Send both from and to, or neither. This window has no maximum length. A comment is free text and can point to one person, so treat it as sensitive. ${CURSOR_RULE}`,
    inputSchema: {
      gymId,
      limit,
      cursor,
      from: from.optional(),
      to: to.optional(),
      climbId: z.string().regex(idPattern).optional().describe("Return only the comments on the climb with this id."),
    },
    path: (args) => `/api/v1/gyms/${args.gymId}/setter-feedback`,
  },
];

const server = new McpServer({ name: "betabud-gym-api", version }, { instructions: INSTRUCTIONS });

for (const tool of tools) {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => {
      // gymId is always in the path. climbId is in the path, but on list_setter_feedback it is a filter in the query.
      const { gymId: _gymId, climbId: climbIdArg, ...query } = args;
      if (tool.name === "list_setter_feedback") {
        query.climbId = climbIdArg;
      }
      const result = await callGymApi({
        path: tool.path(args),
        query,
        token: process.env.BETA_BUD_API_TOKEN,
      });
      return { content: [{ type: "text", text: result.text }], isError: !result.ok };
    }
  );
}

await server.connect(new StdioServerTransport());
