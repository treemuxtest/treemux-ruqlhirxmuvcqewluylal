import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type IncidentInput = {
  company: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  type: "Outage" | "Security" | "Data" | "Payments" | "Infrastructure" | "Other";
  summary: string;
  impact: string;
  constraints: string;
};

const SYSTEM_PROMPT =
  "You are an elite incident commander. Return concise, execution-first guidance and explicit assumptions.";

function buildPrompt(input: IncidentInput) {
  return `Incident profile:\nCompany: ${input.company}\nSeverity: ${input.severity}\nType: ${input.type}\nSummary: ${input.summary}\nImpact: ${input.impact}\nConstraints: ${input.constraints}\n\nReturn JSON with keys: diagnosis, first60, ownerPlan, commsInternal, commsExternal, metrics, blindSpots.`;
}

async function askOpenAI(prompt: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "OPENAI_API_KEY not configured.";

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
        { role: "user", content: [{ type: "input_text", text: prompt }] },
      ],
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    return `OpenAI error ${response.status}`;
  }

  const data = (await response.json()) as {
    output_text?: string;
  };

  return data.output_text ?? "OpenAI returned no text.";
}

async function askAnthropic(prompt: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return "ANTHROPIC_API_KEY not configured.";

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      system: SYSTEM_PROMPT,
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return `Anthropic error ${response.status}`;
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = data.content?.find((part) => part.type === "text")?.text;
  return text ?? "Anthropic returned no text.";
}

async function askOpenRouter(prompt: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return "OPENROUTER_API_KEY not configured.";

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://launchguard.vercel.app",
      "X-Title": "LaunchGuard",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    return `OpenRouter error ${response.status}`;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content ?? "OpenRouter returned no text.";
}

function synthesize(opinions: Record<string, string>) {
  const consensus = ["openai", "anthropic", "openrouter"]
    .map((provider) => `### ${provider.toUpperCase()}\n${opinions[provider]}`)
    .join("\n\n");

  return {
    generatedAt: new Date().toISOString(),
    confidence: "High when all three models agree on first 15 minutes.",
    consensus,
  };
}

export async function POST(req: Request) {
  try {
    const input = (await req.json()) as IncidentInput;

    if (!input.summary || !input.impact || !input.company) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const prompt = buildPrompt(input);
    const [openai, anthropic, openrouter] = await Promise.all([
      askOpenAI(prompt),
      askAnthropic(prompt),
      askOpenRouter(prompt),
    ]);

    const result = synthesize({ openai, anthropic, openrouter });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to generate response." }, { status: 500 });
  }
}
