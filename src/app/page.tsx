"use client";

import { useMemo, useState } from "react";
import { Shield, AlertTriangle, Bot, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AnalyzeResponse = {
  providers: Array<{ provider: string; model: string; ok: boolean; error?: string }>;
  consensus: {
    launchDecision: string;
    averageRiskScore: number;
    executiveSummary: string;
    risks: Array<{
      title: string;
      impactArea: string;
      mitigation: string;
      modelAgreement: string;
      severity: number;
      probability: number;
      score: number;
    }>;
    abuseScenarios: Array<{ scenario: string; redTeamTest: string; safeguard: string }>;
    checklist: string[];
  };
};

const initialForm = {
  feature: "AI support copilot that drafts refund responses and can issue credits up to $100.",
  users: "Customer support agents and team leads",
  data: "Customer emails, order history, billing metadata",
  regions: "United States, European Union",
  constraints: "Need to launch in 10 days with SOC2 in progress",
};

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const riskTone = useMemo(() => {
    if (!result) return "text-slate-100";
    const score = result.consensus.averageRiskScore;
    if (score >= 55) return "text-rose-300";
    if (score >= 35) return "text-amber-300";
    return "text-emerald-300";
  }, [result]);

  const onChange = (field: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const exportBrief = async () => {
    if (!result) return;
    const lines = [
      "# LaunchGuard AI - Launch Brief",
      "",
      `Decision: ${result.consensus.launchDecision}`,
      `Average Risk Score: ${result.consensus.averageRiskScore}`,
      "",
      "## Executive Summary",
      result.consensus.executiveSummary,
      "",
      "## Consensus Risks",
      ...result.consensus.risks.map(
        (r, i) => `${i + 1}. ${r.title} (${r.modelAgreement}) - Score ${r.score}. Mitigation: ${r.mitigation}`,
      ),
      "",
      "## Red-Team Scenarios",
      ...result.consensus.abuseScenarios.map((a, i) => `${i + 1}. ${a.scenario} | Test: ${a.redTeamTest}`),
      "",
      "## Go-Live Checklist",
      ...result.consensus.checklist.map((c, i) => `${i + 1}. ${c}`),
    ].join("\n");

    await navigator.clipboard.writeText(lines);
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Analysis failed.");
        return;
      }
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#0f766e_0%,transparent_35%),radial-gradient(circle_at_80%_0%,#1d4ed8_0%,transparent_30%),linear-gradient(145deg,#020617_20%,#111827_100%)] px-4 py-10 text-slate-100 sm:px-8">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/60 px-3 py-1 text-xs tracking-[0.2em] text-teal-200 uppercase">
            <Shield className="h-3.5 w-3.5" />
            TreeHacks 2026 Demo
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">LaunchGuard AI</h1>
          <p className="max-w-3xl text-slate-300 sm:text-lg">
            Pre-launch command center that runs parallel model audits and returns consensus risks, abuse tests, and a ship/no-ship decision in under a minute.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-700/60 bg-slate-900/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Feature Intake</CardTitle>
              <CardDescription>Describe what you are shipping this sprint.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input value={form.feature} onChange={(e) => onChange("feature", e.target.value)} placeholder="Feature" />
              <Input value={form.users} onChange={(e) => onChange("users", e.target.value)} placeholder="Target users" />
              <Input value={form.data} onChange={(e) => onChange("data", e.target.value)} placeholder="Data touched" />
              <Input value={form.regions} onChange={(e) => onChange("regions", e.target.value)} placeholder="Regions" />
              <Input
                value={form.constraints}
                onChange={(e) => onChange("constraints", e.target.value)}
                placeholder="Deadlines, compliance, team constraints"
              />
              <div className="flex gap-3">
                <Button onClick={runAnalysis} disabled={loading} className="bg-teal-500 text-slate-950 hover:bg-teal-400">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                  Run Multi-Model Audit
                </Button>
                <Button variant="secondary" onClick={exportBrief} disabled={!result}>
                  Copy Launch Brief
                </Button>
              </div>
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </CardContent>
          </Card>

          <Card className="border-slate-700/60 bg-slate-900/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Decision Console</CardTitle>
              <CardDescription>Consensus output from OpenAI, Anthropic, and OpenRouter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-300">Launch decision</p>
              <p className="text-2xl font-semibold text-slate-100">{result?.consensus.launchDecision ?? "Awaiting analysis"}</p>
              <p className={`text-4xl font-bold ${riskTone}`}>{result ? result.consensus.averageRiskScore : "--"}</p>
              <p className="text-xs uppercase tracking-widest text-slate-400">Average risk score</p>
              <p className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3 text-sm text-slate-300">
                {result?.consensus.executiveSummary ?? "Model verdicts will appear here after audit."}
              </p>
            </CardContent>
          </Card>
        </div>

        {result ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-slate-700/60 bg-slate-900/70 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-300" /> Consensus Risks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.consensus.risks.map((r) => (
                  <div key={r.title} className="rounded-xl border border-slate-700/70 bg-slate-950/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-slate-400">{r.modelAgreement}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{r.impactArea}</p>
                    <p className="mt-2 text-sm text-teal-200">Mitigation: {r.mitigation}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full bg-amber-300" style={{ width: `${Math.min(100, r.score)}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-700/60 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-300" /> Go-Live Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.consensus.checklist.map((item) => (
                  <p key={item} className="rounded-lg border border-slate-700/70 bg-slate-950/70 p-2 text-sm text-slate-200">{item}</p>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {result ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-700/60 bg-slate-900/70">
              <CardHeader>
                <CardTitle>Provider Health</CardTitle>
                <CardDescription>Live status from each model provider used in consensus.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.providers.map((p) => (
                  <div key={p.provider} className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-950/70 p-3">
                    <div>
                      <p className="font-medium">{p.provider}</p>
                      <p className="text-xs text-slate-400">{p.model}</p>
                    </div>
                    <p className={`text-sm ${p.ok ? "text-emerald-300" : "text-rose-300"}`}>{p.ok ? "online" : p.error}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-700/60 bg-slate-900/70">
              <CardHeader>
                <CardTitle>Red-Team Scenarios</CardTitle>
                <CardDescription>High-risk misuse paths and concrete tests.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.consensus.abuseScenarios.map((a) => (
                  <div key={a.scenario} className="rounded-lg border border-slate-700/70 bg-slate-950/70 p-3">
                    <p className="font-medium text-slate-100">{a.scenario}</p>
                    <p className="mt-1 text-sm text-amber-200">Test: {a.redTeamTest}</p>
                    <p className="mt-1 text-sm text-teal-200">Safeguard: {a.safeguard}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </main>
  );
}
