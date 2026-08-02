import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface BloomSlice {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface RadarDataPoint {
  level: string;
  current: number;
  ideal: number;
}

interface SubjectBloomData {
  subject: string;
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

interface SummaryMetrics {
  mostUsed: { name: string; percentage: number };
  leastUsed: { name: string; percentage: number };
  balanceScore: number;
}

// Colors aligned with dashboard & Bloom taxonomy levels
const BLOOM_COLORS: Record<string, string> = {
  remember: "#2563EB",
  understand: "#7C3AED",
  apply: "#06B6D4",
  analyze: "#10B981",
  evaluate: "#F59E0B",
  create: "#EF4444",
};

const BLOOM_ORDER = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
];

// Target benchmark percentages for ideal distribution (summing to 100%)
const IDEAL_RATIOS: Record<string, number> = {
  remember: 0.15,
  understand: 0.2,
  apply: 0.25,
  analyze: 0.2,
  evaluate: 0.12,
  create: 0.08,
};

export function BloomAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [bloomDistribution, setBloomDistribution] = useState<BloomSlice[]>([]);
  const [radarData, setRadarData] = useState<RadarDataPoint[]>([]);
  const [subjectWiseBloom, setSubjectWiseBloom] = useState<SubjectBloomData[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics>({
    mostUsed: { name: "N/A", percentage: 0 },
    leastUsed: { name: "N/A", percentage: 0 },
    balanceScore: 0,
  });
  const [recommendations, setRecommendations] = useState<
    { text: string; type: "warning" | "success" }[]
  >([]);

  useEffect(() => {
    fetchBloomAnalyticsData();
  }, []);

  const fetchBloomAnalyticsData = async () => {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setLoading(false);
      return;
    }
    const userId = userData.user.id;

    // 1. Fetch user's questions
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id, bloom_level, subject_id")
      .eq("created_by", userId);

    if (qError || !questions || questions.length === 0) {
      setLoading(false);
      return;
    }

    setTotalQuestions(questions.length);

    // 2. Fetch user's syllabi to map subject_id -> subject name
    const { data: syllabi } = await supabase
      .from("syllabi")
      .select("subject_id, subject")
      .eq("uploaded_by", userId);

    const subjectNameMap = new Map<string, string>();
    (syllabi ?? []).forEach((s) => {
      if (s.subject_id) {
        subjectNameMap.set(s.subject_id, s.subject || "Unnamed Subject");
      }
    });

    // --- Process Overall Distribution ---
    const counts: Record<string, number> = {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0,
    };

    // --- Process Subject-Wise Distribution ---
    // Structure: subjectId -> { remember: 0, understand: 0, ... }
    const subjectCounts: Record<string, Record<string, number>> = {};

    questions.forEach((q) => {
      const rawLevel = q.bloom_level?.toLowerCase()?.trim() || "";
      if (BLOOM_ORDER.includes(rawLevel)) {
        counts[rawLevel] = (counts[rawLevel] || 0) + 1;

        if (q.subject_id) {
          if (!subjectCounts[q.subject_id]) {
            subjectCounts[q.subject_id] = {
              remember: 0,
              understand: 0,
              apply: 0,
              analyze: 0,
              evaluate: 0,
              create: 0,
            };
          }
          subjectCounts[q.subject_id][rawLevel] += 1;
        }
      }
    });

    const totalValid = questions.length;

    // Build Overall Distribution Pie Data
    const pieData: BloomSlice[] = BLOOM_ORDER.map((level) => {
      const val = counts[level];
      const pct = totalValid > 0 ? Math.round((val / totalValid) * 100) : 0;
      return {
        name: level.charAt(0).toUpperCase() + level.slice(1),
        value: val,
        color: BLOOM_COLORS[level],
        percentage: pct,
      };
    });
    setBloomDistribution(pieData);

    // Build Radar Data (Current vs Ideal Count)
    const radar: RadarDataPoint[] = BLOOM_ORDER.map((level) => {
      const idealCount = Math.round(totalValid * IDEAL_RATIOS[level]);
      return {
        level: level.charAt(0).toUpperCase() + level.slice(1),
        current: counts[level],
        ideal: idealCount,
      };
    });
    setRadarData(radar);

    // Build Subject-Wise Bar Data
    const subjectData: SubjectBloomData[] = Object.entries(subjectCounts).map(
      ([subId, subLevels]) => {
        return {
          subject: subjectNameMap.get(subId) || "General / Unassigned",
          remember: subLevels.remember,
          understand: subLevels.understand,
          apply: subLevels.apply,
          analyze: subLevels.analyze,
          evaluate: subLevels.evaluate,
          create: subLevels.create,
        };
      }
    );
    setSubjectWiseBloom(subjectData);

    // --- Compute Summary Metrics & Score ---
    let maxLevel = { name: "N/A", count: -1, pct: 0 };
    let minLevel = { name: "N/A", count: Infinity, pct: 0 };

    BLOOM_ORDER.forEach((level) => {
      const cnt = counts[level];
      const pct = totalValid > 0 ? Math.round((cnt / totalValid) * 100) : 0;
      const formattedName = level.charAt(0).toUpperCase() + level.slice(1);

      if (cnt > maxLevel.count) {
        maxLevel = { name: formattedName, count: cnt, pct };
      }
      if (cnt < minLevel.count) {
        minLevel = { name: formattedName, count: cnt, pct };
      }
    });

    // Balance score using Cosine Similarity between actual distribution vector and ideal ratio vector
    let dotProduct = 0;
    let normActualSq = 0;
    let normIdealSq = 0;

    BLOOM_ORDER.forEach((level) => {
      const actualRatio = totalValid > 0 ? counts[level] / totalValid : 0;
      const idealRatio = IDEAL_RATIOS[level];

      dotProduct += actualRatio * idealRatio;
      normActualSq += actualRatio * actualRatio;
      normIdealSq += idealRatio * idealRatio;
    });

    const sim =
      normActualSq > 0 && normIdealSq > 0
        ? dotProduct / (Math.sqrt(normActualSq) * Math.sqrt(normIdealSq))
        : 0;

    const balanceScoreVal = Math.min(100, Math.round(sim * 100));

    setSummaryMetrics({
      mostUsed: { name: maxLevel.name, percentage: maxLevel.pct },
      leastUsed: {
        name: minLevel.count === Infinity ? "None" : minLevel.name,
        percentage: minLevel.pct,
      },
      balanceScore: balanceScoreVal,
    });

    // --- Generate Dynamic AI Recommendations ---
    const generatedRecs: { text: string; type: "warning" | "success" }[] = [];

    BLOOM_ORDER.forEach((level) => {
      const actualCount = counts[level];
      const idealCount = Math.round(totalValid * IDEAL_RATIOS[level]);
      const diff = idealCount - actualCount;
      const formattedName = level.charAt(0).toUpperCase() + level.slice(1);
      const targetPct = Math.round(IDEAL_RATIOS[level] * 100);

      if (diff > Math.max(3, Math.round(totalValid * 0.05))) {
        generatedRecs.push({
          text: `Increase "${formattedName}" level questions by ~${diff} to reach optimal benchmark (target: ${targetPct}%).`,
          type: "warning",
        });
      } else if (diff < -Math.max(3, Math.round(totalValid * 0.05))) {
        generatedRecs.push({
          text: `Reduce or diversify "${formattedName}" level questions by ~${Math.abs(diff)} to avoid over-representation (target: ${targetPct}%).`,
          type: "warning",
        });
      }
    });

    if (generatedRecs.length === 0) {
      generatedRecs.push({
        text: "Your question bank is well-balanced across all Bloom cognitive levels!",
        type: "success",
      });
    }

    setRecommendations(generatedRecs.slice(0, 4)); // Limit to top 4 recommendations
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading Bloom's Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bloom's Taxonomy Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Analyze cognitive level distribution across your question bank ({totalQuestions} total questions)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Most Used Level</h3>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl font-bold">{summaryMetrics.mostUsed.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {summaryMetrics.mostUsed.percentage}% of total questions
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Least Used Level</h3>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold">{summaryMetrics.leastUsed.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {summaryMetrics.leastUsed.percentage}% of total questions
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Balance Score</h3>
            <AlertCircle className="w-4 h-4 text-warning" />
          </div>
          <p className="text-2xl font-bold">{summaryMetrics.balanceScore}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {summaryMetrics.balanceScore >= 85
              ? "Excellent Balance"
              : summaryMetrics.balanceScore >= 70
              ? "Good Balance"
              : "Needs Improvement"}
          </p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Distribution */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
          <h2 className="text-xl font-semibold mb-4">Overall Distribution</h2>
          {totalQuestions === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              No questions found. Add questions to view distribution.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bloomDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bloomDistribution.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                {bloomDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm truncate">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Current vs Ideal */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
          <h2 className="text-xl font-semibold mb-4">Current vs Ideal Distribution</h2>
          {totalQuestions === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              No data available for analysis.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="level" />
                  <PolarRadiusAxis />
                  <Radar
                    name="Current"
                    dataKey="current"
                    stroke="#2563EB"
                    fill="#2563EB"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Ideal"
                    dataKey="ideal"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.3}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-sm">Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                  <span className="text-sm">Ideal</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Subject-wise Analysis */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Subject-wise Bloom's Distribution</h2>
        {subjectWiseBloom.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            No subject-wise question data available.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={subjectWiseBloom}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="subject" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="remember" name="Remember" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="understand" name="Understand" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                <Bar dataKey="apply" name="Apply" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="analyze" name="Analyze" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="evaluate" name="Evaluate" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="create" name="Create" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#2563EB]"></div>
                <span className="text-sm">Remember</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#7C3AED]"></div>
                <span className="text-sm">Understand</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#06B6D4]"></div>
                <span className="text-sm">Apply</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                <span className="text-sm">Analyze</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                <span className="text-sm">Evaluate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                <span className="text-sm">Create</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-6">
        <h2 className="font-semibold mb-4">AI Recommendations</h2>
        <div className="space-y-3">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div
                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  rec.type === "warning" ? "bg-warning" : "bg-success"
                }`}
              ></div>
              <p className="text-sm">{rec.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}