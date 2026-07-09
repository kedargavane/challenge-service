/**
 * Extracts health metrics from uploaded screenshots (Apple Health, Garmin
 * Connect, Whoop, etc.) using Claude's vision capability. Requires
 * ANTHROPIC_API_KEY set as an env var on this service -- get one from
 * console.anthropic.com. This is a real production API call, separate
 * from anything in the chat environment.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

export type ExtractedRow = {
  date: string; // YYYY-MM-DD
  steps?: number | null;
  sleepHours?: number | null;
  workoutCount?: number | null;
  workoutDurationMinutes?: number | null;
};

export async function extractMetricsFromScreenshots(
  images: { base64: string; mediaType: string }[]
): Promise<ExtractedRow[]> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set on this service");
  }

  const content: any[] = [
    {
      type: "text",
      text: `These are screenshots from health/fitness tracking apps (Apple Health, Garmin Connect, Whoop, or similar). Extract every date visible and its associated metric value.

CRITICAL: Your entire response must be nothing but the JSON array itself. Do not include any explanation, preamble, commentary, or markdown code fences before or after it -- not even a single sentence. Start your response directly with [ and end it with ].

Each element:
{"date": "YYYY-MM-DD", "steps": number or null, "sleepHours": number or null, "workoutCount": number or null, "workoutDurationMinutes": number or null}

Rules:
- Infer the metric type from context: a list titled "Steps" means steps; a sleep duration screen means sleepHours; a workout/exercise screen means workoutDurationMinutes (and workoutCount = number of sessions shown).
- Only include fields you can actually read from that image -- use null for anything not shown.
- If the same date appears across multiple screenshots with different metric types, merge them into one row per date in your final output.
- Convert sleep duration to decimal hours (e.g. "8h 12m" -> 8.2).
- Dates may appear in different formats (e.g. "6 Jul 2026", "07/06/2026") -- always output as YYYY-MM-DD. If no year is visible, infer the most likely year from context; do not guess wildly.
- If a number is genuinely illegible, omit that field rather than guessing.`,
    },
  ];

  for (const img of images) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const textBlock = data.content.find((b: any) => b.type === "text");
  if (!textBlock) throw new Error("No text response from vision extraction");

  // Claude sometimes adds a sentence or two before/after the JSON despite
  // instructions to return only JSON. Extract the array substring
  // directly (first '[' to matching last ']') instead of assuming the
  // whole response is clean JSON.
  const text = textBlock.text;
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Could not find a JSON array in the model's response: ${text.slice(0, 200)}`);
  }
  const jsonSlice = text.slice(start, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch (err) {
    throw new Error(`Failed to parse extracted JSON: ${jsonSlice.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array from extraction");
  return parsed as ExtractedRow[];
}
