import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Sparkles,
  Award,
  Target,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

// ─── Types matching the analytics-dashboard edge function's response ─────────
type Totals = {
  totalPapers: number;
  totalQuestions: number;
  totalAIQuestions: number;
  approvedCount: number;
  approvalRate: number;
  activeFaculty: number;
};

type Trends = {
  papersChangePct: number | null;
  aiQuestionsChangePct: number | null;
  approvalRateChangePct: number | null;
  activeFacultyChangePct: number | null;
};

type MonthlyPoint = { month: string; papers: number; questions: number; approvalRate: number };
type FacultyUsage = { name: string; papers: number; questions: number; aiUsagePercent: number };
type SubjectPopularity = { subject: string; count: number };
type BloomPoint = { level: string; count: number; percentage: number };
type TypePoint = { type: string; count: number; percentage: number };

type AnalyticsData = {
  totals: Totals;
  trends: Trends;
  monthlyTrend: MonthlyPoint[];
  facultyUsage: FacultyUsage[];
  subjectPopularity: SubjectPopularity[];
  subjectsCovered: number;
  bloomDistribution: BloomPoint[];
  questionTypeDistribution: TypePoint[];
  mostRecentQuestionAt: string | null;
};

const SUBJECT_COLORS = ["#2563EB", "#7C3AED", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "No activity yet";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? "s" : ""} ago`;
}

function TrendIndicator({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-sm text-muted-foreground">New this period</span>;
  }
  const isUp = pct >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center gap-1 mt-2">
      <Icon className={`w-4 h-4 ${isUp ? "text-success" : "text-destructive"}`} />
      <span className={`text-sm ${isUp ? "text-success" : "text-destructive"}`}>
        {isUp ? "+" : ""}
        {pct}%
      </span>
    </div>
  );
}

export function AnalyticsDashboardPage() {
  const [timeRange, setTimeRange] = useState("last-6-months");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      const { data: resp, error: invokeErr } = await supabase.functions.invoke("analytics-dashboard", {
        body: { range: timeRange },
      });
      if (cancelled) return;

      const errMessage = invokeErr?.message || (resp as any)?.error;
      if (errMessage) {
        setError(errMessage);
        setData(null);
      } else {
        setData(resp as AnalyticsData);
      }
      setLoading(false);
    }
    fetchAnalytics();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="last-3-months">Last 3 Months</SelectItem>
            <SelectItem value="last-6-months">Last 6 Months</SelectItem>
            <SelectItem value="last-year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        !error && (
          <div className="text-center py-24 text-muted-foreground">No analytics data available.</div>
        )
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Papers Generated</p>
                  <p className="text-3xl font-bold mt-2">{data.totals.totalPapers}</p>
                  <TrendIndicator pct={data.trends.papersChangePct} />
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Faculty</p>
                  <p className="text-3xl font-bold mt-2">{data.totals.activeFaculty}</p>
                  <TrendIndicator pct={data.trends.activeFacultyChangePct} />
                </div>
                <div className="p-3 rounded-xl bg-secondary/10">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">AI Questions Generated</p>
                  <p className="text-3xl font-bold mt-2">{data.totals.totalAIQuestions}</p>
                  <TrendIndicator pct={data.trends.aiQuestionsChangePct} />
                </div>
                <div className="p-3 rounded-xl bg-accent/10">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approval Rate</p>
                  <p className="text-3xl font-bold mt-2">{data.totals.approvalRate}%</p>
                  <TrendIndicator pct={data.trends.approvalRateChangePct} />
                </div>
                <div className="p-3 rounded-xl bg-success/10">
                  <Award className="w-6 h-6 text-success" />
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Paper Generation Trends</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.monthlyTrend}>
                  <defs>
                    <linearGradient id="colorPapers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="papers"
                    stroke="#2563EB"
                    fillOpacity={1}
                    fill="url(#colorPapers)"
                    name="Papers"
                  />
                  <Area
                    type="monotone"
                    dataKey="questions"
                    stroke="#7C3AED"
                    fillOpacity={1}
                    fill="url(#colorQuestions)"
                    name="Questions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Approval Rate Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="approvalRate"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: "#10B981", r: 5 }}
                    name="Approval Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Faculty Usage and Subject Popularity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Faculty Usage Statistics</h2>
              {data.facultyUsage.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                  No faculty activity in this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.facultyUsage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="papers" fill="#2563EB" radius={[0, 8, 8, 0]} name="Papers" />
                    <Bar dataKey="aiUsagePercent" fill="#7C3AED" radius={[0, 8, 8, 0]} name="AI-Generated %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Questions by Subject</h2>
              {data.subjectPopularity.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                  No questions generated in this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={data.subjectPopularity}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ subject, percent }) => `${subject}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.subjectPopularity.map((entry, i) => (
                        <Cell key={`cell-${entry.subject}`} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bloom's Distribution and Question Type Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Bloom's Taxonomy Distribution</h2>
              <div className="space-y-4">
                {data.bloomDistribution.map((item) => (
                  <div key={item.level}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{item.level}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.count} questions ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Question Type Distribution</h2>
              {data.questionTypeDistribution.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm py-12">
                  No questions generated in this period.
                </div>
              ) : (
                <div className="space-y-4">
                  {data.questionTypeDistribution.map((item) => (
                    <div key={item.type}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{item.type}</span>
                        <span className="text-sm font-semibold text-primary">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent to-success transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-warning" />
              <h2 className="text-xl font-semibold">Period Summary</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl">
                <Target className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold">{data.totals.totalQuestions} Questions Generated</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {data.totals.totalAIQuestions} generated with AI assistance
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Last generated {formatRelativeTime(data.mostRecentQuestionAt)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-xl">
                <BookOpen className="w-8 h-8 text-success mb-2" />
                <h3 className="font-semibold">{data.subjectsCovered} Subjects Covered</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Had at least one question generated in this period
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 rounded-xl">
                <Award className="w-8 h-8 text-secondary mb-2" />
                <h3 className="font-semibold">
                  {data.totals.approvedCount} Approved ({data.totals.approvalRate}%)
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Questions marked approved out of {data.totals.totalQuestions} total
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}