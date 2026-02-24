"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Copy, Shield, Siren, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Severity = "SEV-1" | "SEV-2" | "SEV-3";
type IncidentType =
  | "Outage"
  | "Security"
  | "Data"
  | "Payments"
  | "Infrastructure"
  | "Other";

type PlanResponse = {
  generatedAt: string;
  confidence: string;
  consensus: string;
};

const scenarioTemplates = [
  {
    label: "API Meltdown",
    severity: "SEV-1" as Severity,
    type: "Outage" as IncidentType,
    summary: "Global API error rate spiked to 78% after a deploy. Login and checkout are failing.",
    impact: "Enterprise customers blocked; projected revenue loss is $220K/hour.",
    constraints: "Only two backend engineers online. Rollback script has been flaky for last two releases.",
  },
  {
    label: "Possible Breach",
    severity: "SEV-1" as Severity,
    type: "Security" as IncidentType,
    summary: "Suspicious admin token usage from unknown ASN and mass export queries on customer tables.",
    impact: "Potential exposure of sensitive customer records and legal reporting risk.",
    constraints: "No dedicated security team. Need board update in 45 minutes.",
  },
  {
    label: "Payments Down",
    severity: "SEV-2" as Severity,
    type: "Payments" as IncidentType,
    summary: "Card authorization failures at one PSP region with intermittent success.",
    impact: "47% checkout drop and escalating support tickets from top accounts.",
    constraints: "Contract with backup PSP exists but failover runbook is outdated.",
  },
];

export default function Home() {
  const [company, setCompany] = useState("Northstar Labs");
  const [severity, setSeverity] = useState<Severity>("SEV-1");
  const [type, setType] = useState<IncidentType>("Outage");
  const [summary, setSummary] = useState(scenarioTemplates[0].summary);
  const [impact, setImpact] = useState(scenarioTemplates[0].impact);
  const [constraints, setConstraints] = useState(scenarioTemplates[0].constraints);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const score = useMemo(() => {
    const base = severity === "SEV-1" ? 82 : severity === "SEV-2" ? 63 : 41;
    const modifier = type === "Security" ? 12 : type === "Payments" ? 7 : 0;
    return Math.min(99, base + modifier);
  }, [severity, type]);

  async function generatePlan() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, severity, type, summary, impact, constraints }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to generate plan");
      }

      const data = (await response.json()) as PlanResponse;
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function loadScenario(index: number) {
    const s = scenarioTemplates[index];
    setSeverity(s.severity);
    setType(s.type);
    setSummary(s.summary);
    setImpact(s.impact);
    setConstraints(s.constraints);
  }

  async function copyConsensus() {
    if (!result) return;
    await navigator.clipboard.writeText(result.consensus);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#fef3c7_0%,#fde68a_18%,transparent_40%),radial-gradient(circle_at_80%_0%,#bfdbfe_0%,#c7d2fe_25%,transparent_45%),linear-gradient(120deg,#0f172a,#111827,#1f2937)] p-6 text-white md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-amber-200">TreeHacks 2026</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">LaunchGuard</h1>
          <p className="max-w-3xl text-sm text-slate-100 md:text-base">
            Multi-model incident command copilot for startups. Convert messy outage or security signals
            into a 60-minute execution plan and stakeholder messaging in one click.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">Reduces MTTR</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">SOC2-friendly comms</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">Board-ready updates</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="border-white/25 bg-slate-950/70 text-white lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Siren className="h-6 w-6 text-amber-300" />
                Incident Intake
              </CardTitle>
              <CardDescription className="text-slate-300">
                Use a demo scenario or input your live incident context.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {scenarioTemplates.map((s, idx) => (
                  <Button
                    key={s.label}
                    variant="outline"
                    className="border-white/30 bg-white/5 text-white hover:bg-white/20"
                    onClick={() => loadScenario(idx)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="h-10 rounded-md border border-white/20 bg-slate-900 px-3 text-sm"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                >
                  <option>SEV-1</option>
                  <option>SEV-2</option>
                  <option>SEV-3</option>
                </select>
                <select
                  className="h-10 rounded-md border border-white/20 bg-slate-900 px-3 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as IncidentType)}
                >
                  <option>Outage</option>
                  <option>Security</option>
                  <option>Data</option>
                  <option>Payments</option>
                  <option>Infrastructure</option>
                  <option>Other</option>
                </select>
              </div>
              <textarea
                className="min-h-20 w-full rounded-md border border-white/20 bg-slate-900 p-3 text-sm"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="What happened?"
              />
              <textarea
                className="min-h-20 w-full rounded-md border border-white/20 bg-slate-900 p-3 text-sm"
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                placeholder="Business/customer impact"
              />
              <textarea
                className="min-h-20 w-full rounded-md border border-white/20 bg-slate-900 p-3 text-sm"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="Operational constraints"
              />
              <Button
                disabled={loading}
                className="w-full bg-amber-300 text-black hover:bg-amber-200"
                onClick={generatePlan}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {loading ? "Coordinating models..." : "Generate Incident Plan"}
              </Button>
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            <Card className="border-white/25 bg-slate-950/70 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <AlertTriangle className="h-5 w-5 text-rose-300" />
                  Incident Pressure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-3 w-full rounded-full bg-white/10">
                  <div className="h-3 rounded-full bg-gradient-to-r from-amber-300 to-rose-400" style={{ width: `${score}%` }} />
                </div>
                <p className="mt-3 text-sm text-slate-300">Estimated severity score: {score}/100</p>
              </CardContent>
            </Card>

            <Card className="border-white/25 bg-slate-950/70 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Shield className="h-5 w-5 text-emerald-300" />
                  Model Consensus
                </CardTitle>
                <CardDescription className="text-slate-300">
                  OpenAI + Anthropic + OpenRouter combined with conflict awareness.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result ? (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-300">Generated: {new Date(result.generatedAt).toLocaleString()}</p>
                      <Button size="sm" variant="outline" className="border-white/25 bg-white/5 text-white" onClick={copyConsensus}>
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <p className="mb-4 text-sm text-emerald-300">{result.confidence}</p>
                    <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-3 text-xs leading-6 text-slate-100">
                      {result.consensus}
                    </pre>
                  </>
                ) : (
                  <p className="text-sm text-slate-300">
                    No plan generated yet. Run a scenario to produce a live incident packet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
