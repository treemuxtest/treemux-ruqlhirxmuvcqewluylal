import { NextResponse } from "next/server";

type Risk = {
  title: string;
  severity: number;
  probability: number;
  impactArea: string;
  why: string;
  mitigation: string;
};

type ModelAnalysis = {
  summary: string;
  oneLineVerdict: string;
  risks: Risk[];
  abuseScenarios: { scenario: string; redTeamTest: string; safeguard: string }[];
  launchChecklist: string[];
};

type ProviderResult = {
  provider: string;
  model: string;
  ok: boolean;
  analysis?: ModelAnalysis;
  error?: string;
};

const SYSTEM_PROMPT = `You are a launch-risk auditor for AI products.
Return ONLY valid minified JSON with keys:
summary (string), oneLineVerdict (string), risks (array of up to 6 objects), abuseScenarios (array of up to 4 objects), launchChecklist (array of up to 10 strings).
Each risk object requires: title, severity (1-10), probability (1-10), impactArea, why, mitigation.
Each abuse scenario requires: scenario, redTeamTest, safeguard.
Be concrete, non-generic, and pragmatic for a startup shipping this week.`;

function clampScore(n: number) {
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(10, Math.round(n)));
}

function normalizeAnalysis(raw: unknown): ModelAnalysis {
  const rawObj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawRisks = Array.isArray(rawObj.risks) ? rawObj.risks : [];
  const rawAbuseScenarios = Array.isArray(rawObj.abuseScenarios) ? rawObj.abuseScenarios : [];
  const rawChecklist = Array.isArray(rawObj.launchChecklist) ? rawObj.launchChecklist : [];

  const risks = rawRisks
    .slice(0, 6)
    .map((r: unknown) => {
      const item = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
      return {
        title: String(item.title ?? "Unspecified risk"),
        severity: clampScore(Number(item.severity)),
        probability: clampScore(Number(item.probability)),
        impactArea: String(item.impactArea ?? "Operations"),
        why: String(item.why ?? ""),
        mitigation: String(item.mitigation ?? ""),
      };
    });

  const abuseScenarios = rawAbuseScenarios
    .slice(0, 4)
    .map((s: unknown) => {
      const item = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      return {
        scenario: String(item.scenario ?? ""),
        redTeamTest: String(item.redTeamTest ?? ""),
        safeguard: String(item.safeguard ?? ""),
      };
    });

  const launchChecklist = rawChecklist
    .slice(0, 10)
    .map((item: unknown) => String(item));

  return {
    summary: String(rawObj.summary ?? "No summary generated."),
    oneLineVerdict: String(rawObj.oneLineVerdict ?? "Proceed with controlled launch."),
    risks,
    abuseScenarios,
    launchChecklist,
  };
}

function parseJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model output was not JSON.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function callOpenAI(input: string): Promise<ProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = "gpt-4.1-mini";
  if (!apiKey) {
    return { provider: "OpenAI", model, ok: false, error: "OPENAI_API_KEY missing" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
    }),
  });

  if (!res.ok) {
    return { provider: "OpenAI", model, ok: false, error: `HTTP ${res.status}` };
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? "";
  const analysis = normalizeAnalysis(parseJson(String(text)));
  return { provider: "OpenAI", model, ok: true, analysis };
}

async function callAnthropic(input: string): Promise<ProviderResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = "claude-3-5-sonnet-latest";
  if (!apiKey) {
    return { provider: "Anthropic", model, ok: false, error: "ANTHROPIC_API_KEY missing" };
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: input }],
    }),
  });

  if (!res.ok) {
    return { provider: "Anthropic", model, ok: false, error: `HTTP ${res.status}` };
  }

  const json = await res.json();
  const text = json?.content?.[0]?.text ?? "";
  const analysis = normalizeAnalysis(parseJson(String(text)));
  return { provider: "Anthropic", model, ok: true, analysis };
}

async function callOpenRouter(input: string): Promise<ProviderResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = "meta-llama/llama-3.3-70b-instruct";
  if (!apiKey) {
    return { provider: "OpenRouter", model, ok: false, error: "OPENROUTER_API_KEY missing" };
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://launchguard.vercel.app",
      "X-Title": "LaunchGuard AI",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
    }),
  });

  if (!res.ok) {
    return { provider: "OpenRouter", model, ok: false, error: `HTTP ${res.status}` };
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? "";
  const analysis = normalizeAnalysis(parseJson(String(text)));
  return { provider: "OpenRouter", model, ok: true, analysis };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const feature = String(body?.feature ?? "").trim();
    const users = String(body?.users ?? "").trim();
    const data = String(body?.data ?? "").trim();
    const regions = String(body?.regions ?? "").trim();
    const constraints = String(body?.constraints ?? "").trim();

    if (!feature) {
      return NextResponse.json({ error: "Feature description is required." }, { status: 400 });
    }

    const input = `Feature: ${feature}\nUsers: ${users || "Not specified"}\nData: ${data || "Not specified"}\nRegions: ${regions || "Not specified"}\nConstraints: ${constraints || "None"}`;

    const settled = await Promise.allSettled([
      callOpenAI(input),
      callAnthropic(input),
      callOpenRouter(input),
    ]);

    const providers: ProviderResult[] = settled.map((s, i) => {
      const fallback = ["OpenAI", "Anthropic", "OpenRouter"][i];
      if (s.status === "fulfilled") return s.value;
      return { provider: fallback, model: "unknown", ok: false, error: s.reason?.message ?? "Unhandled failure" };
    });

    const successful = providers.filter((p) => p.ok && p.analysis) as Array<ProviderResult & { analysis: ModelAnalysis }>;
    if (successful.length === 0) {
      return NextResponse.json({ error: "All model providers failed.", providers }, { status: 502 });
    }

    const riskMap = new Map<string, { title: string; count: number; totalSeverity: number; totalProbability: number; impactArea: string; mitigation: string }>();
    const checklist = new Set<string>();
    const abuse: { scenario: string; redTeamTest: string; safeguard: string }[] = [];

    for (const p of successful) {
      for (const item of p.analysis.launchChecklist) checklist.add(item);
      for (const sc of p.analysis.abuseScenarios) abuse.push(sc);
      for (const r of p.analysis.risks) {
        const key = r.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
        const current = riskMap.get(key);
        if (current) {
          current.count += 1;
          current.totalSeverity += r.severity;
          current.totalProbability += r.probability;
        } else {
          riskMap.set(key, {
            title: r.title,
            count: 1,
            totalSeverity: r.severity,
            totalProbability: r.probability,
            impactArea: r.impactArea,
            mitigation: r.mitigation,
          });
        }
      }
    }

    const consensusRisks = Array.from(riskMap.values())
      .map((r) => {
        const severity = clampScore(r.totalSeverity / r.count);
        const probability = clampScore(r.totalProbability / r.count);
        return {
          title: r.title,
          impactArea: r.impactArea,
          mitigation: r.mitigation,
          modelAgreement: `${r.count}/${successful.length}`,
          severity,
          probability,
          score: severity * probability,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const avgScore = consensusRisks.length
      ? Math.round(consensusRisks.reduce((acc, r) => acc + r.score, 0) / consensusRisks.length)
      : 25;

    const launchDecision =
      avgScore >= 55
        ? "Hold launch for remediation"
        : avgScore >= 35
          ? "Limited rollout with strict guardrails"
          : "Proceed with staged launch";

    return NextResponse.json({
      providers,
      consensus: {
        launchDecision,
        averageRiskScore: avgScore,
        risks: consensusRisks,
        abuseScenarios: abuse.slice(0, 6),
        checklist: Array.from(checklist).slice(0, 12),
        executiveSummary: successful.map((s) => `${s.provider}: ${s.analysis.oneLineVerdict}`).join(" | "),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
