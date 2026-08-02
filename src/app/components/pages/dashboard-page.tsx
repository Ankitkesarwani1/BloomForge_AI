import { useEffect, useState } from "react";
import {
  BookOpen,
  FileText,
  Database,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { useNavigate } from "react-router";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";

interface StatCard {
  label: string;
  value: string;
  icon: typeof BookOpen;
  color: string;
  bgColor: string;
}

interface BloomSlice {
  name: string;
  value: number;
  color: string;
}

interface UnitCoveragePoint {
  unitId: string;
  unitNumber: number;
  title: string;
  displayTitle: string;
  questionCount: number;
  coverage: number; // For compatibility / bar value
}

interface WeeklyActivityPoint {
  date: string;
  papers: number;
}

interface ActivityItem {
  title: string;
  time: string;
  status: "success" | "warning" | "info";
}

interface SubjectOption {
  id: string;
  name: string;
}

// Fixed colors per Bloom level
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

const DEFAULT_STATS: StatCard[] = [
  {
    label: "Total Subjects",
    value: "–",
    icon: BookOpen,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    label: "Question Papers",
    value: "–",
    icon: FileText,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    label: "Question Bank",
    value: "–",
    icon: Database,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    label: "AI Generated",
    value: "–",
    icon: Sparkles,
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Helper to truncate long unit titles for X-axis fit
function truncateTitle(title: string, maxLength: number = 14): string {
  if (!title) return "";
  if (title.length <= maxLength) return title;
  return `${title.slice(0, maxLength)}…`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>(DEFAULT_STATS);

  // Subject filter states
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [coverageSubjectId, setCoverageSubjectId] = useState<string>("all");

  const [bloomData, setBloomData] = useState<BloomSlice[]>([]);
  const [coverageData, setCoverageData] = useState<UnitCoveragePoint[]>([]);
  const [activityData, setActivityData] = useState<WeeklyActivityPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Re-fetch Bloom's distribution when selected subject changes
  useEffect(() => {
    fetchBloomDistributionForSelectedSubject();
  }, [selectedSubjectId]);

  // Re-fetch Coverage distribution when selected subject changes
  useEffect(() => {
    fetchCoverageForSelectedSubject();
  }, [coverageSubjectId]);

  const fetchDashboardData = async () => {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setLoading(false);
      return;
    }
    const userId = userData.user.id;

    await Promise.all([
      fetchStatsAndSubjects(userId),
      fetchBloomDistribution(userId, selectedSubjectId),
      fetchCoverage(userId, coverageSubjectId),
      fetchWeeklyActivity(userId),
      fetchRecentActivity(userId),
    ]);

    setLoading(false);
  };

  const fetchBloomDistributionForSelectedSubject = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await fetchBloomDistribution(userData.user.id, selectedSubjectId);
    }
  };

  const fetchCoverageForSelectedSubject = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await fetchCoverage(userData.user.id, coverageSubjectId);
    }
  };

  const fetchStatsAndSubjects = async (userId: string) => {
    const [syllabiRes, papersRes, questionsRes, aiRes] = await Promise.all([
      supabase.from("syllabi").select("subject_id, subject").eq("uploaded_by", userId),
      supabase.from("question_papers").select("id", { count: "exact", head: true }).eq("created_by", userId),
      supabase.from("questions").select("id", { count: "exact", head: true }).eq("created_by", userId),
      supabase.from("questions").select("id", { count: "exact", head: true }).eq("created_by", userId).eq("source", "ai_generated"),
    ]);

    // Distinct subjects mapping for dropdown
    const uniqueSubjectsMap = new Map<string, string>();
    (syllabiRes.data ?? []).forEach((s) => {
      if (s.subject_id) {
        uniqueSubjectsMap.set(s.subject_id, s.subject || "Unnamed Subject");
      }
    });

    const subjectList: SubjectOption[] = Array.from(uniqueSubjectsMap.entries()).map(
      ([id, name]) => ({ id, name })
    );

    setSubjects(subjectList);

    setStats([
      { label: "Total Subjects", value: String(subjectList.length), icon: BookOpen, color: "text-primary", bgColor: "bg-primary/10" },
      { label: "Question Papers", value: String(papersRes.count ?? 0), icon: FileText, color: "text-secondary", bgColor: "bg-secondary/10" },
      { label: "Question Bank", value: String(questionsRes.count ?? 0), icon: Database, color: "text-accent", bgColor: "bg-accent/10" },
      { label: "AI Generated", value: String(aiRes.count ?? 0), icon: Sparkles, color: "text-success", bgColor: "bg-success/10" },
    ]);
  };

  // Pie chart: count of this user's questions filtered by subject_id (if selected).
  const fetchBloomDistribution = async (userId: string, subjectId: string) => {
    let query = supabase.from("questions").select("bloom_level").eq("created_by", userId);

    if (subjectId !== "all") {
      query = query.eq("subject_id", subjectId);
    }

    const { data, error } = await query;
    if (error || !data) {
      setBloomData([]);
      return;
    }

    const counts = new Map<string, number>();
    for (const row of data) {
      if (!row.bloom_level) continue;
      counts.set(row.bloom_level, (counts.get(row.bloom_level) ?? 0) + 1);
    }

    const result = BLOOM_ORDER.filter((level) => counts.has(level)).map((level) => ({
      name: level.charAt(0).toUpperCase() + level.slice(1),
      value: counts.get(level)!,
      color: BLOOM_COLORS[level],
    }));
    setBloomData(result);
  };

  // Syllabus Coverage Analysis Bar Chart
  const fetchCoverage = async (userId: string, subjectId: string) => {
    let syllabiQuery = supabase.from("syllabi").select("id, subject_id").eq("uploaded_by", userId);

    if (subjectId !== "all") {
      syllabiQuery = syllabiQuery.eq("subject_id", subjectId);
    }

    const { data: syllabiData, error: syllabiError } = await syllabiQuery;

    if (syllabiError || !syllabiData || syllabiData.length === 0) {
      setCoverageData([]);
      return;
    }

    const syllabusIds = syllabiData.map((s) => s.id);

    const { data: unitsData, error: unitsError } = await supabase
      .from("units")
      .select("id, unit_number, title, syllabus_id")
      .in("syllabus_id", syllabusIds)
      .order("unit_number", { ascending: true });

    if (unitsError || !unitsData || unitsData.length === 0) {
      setCoverageData([]);
      return;
    }

    const unitIds = unitsData.map((u) => u.id);

    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("unit_id")
      .in("unit_id", unitIds);

    if (questionsError) {
      setCoverageData([]);
      return;
    }

    const questionCountByUnit = new Map<string, number>();
    for (const q of questionsData ?? []) {
      if (!q.unit_id) continue;
      questionCountByUnit.set(q.unit_id, (questionCountByUnit.get(q.unit_id) ?? 0) + 1);
    }

    const result: UnitCoveragePoint[] = unitsData.map((u) => {
      const qCount = questionCountByUnit.get(u.id) ?? 0;
      const titleStr = u.title || `Unit ${u.unit_number}`;
      return {
        unitId: u.id,
        unitNumber: u.unit_number,
        title: titleStr,
        displayTitle: truncateTitle(titleStr),
        questionCount: qCount,
        coverage: qCount,
      };
    });

    setCoverageData(result);
  };

  const fetchWeeklyActivity = async (userId: string) => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("question_papers")
      .select("created_at")
      .eq("created_by", userId)
      .gte("created_at", start.toISOString());

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

    const countByDateKey = new Map<string, number>();
    if (!error && data) {
      for (const row of data) {
        const key = new Date(row.created_at).toDateString();
        countByDateKey.set(key, (countByDateKey.get(key) ?? 0) + 1);
      }
    }

    setActivityData(
      days.map((d) => ({
        date: d.toLocaleDateString("en-US", { weekday: "short" }),
        papers: countByDateKey.get(d.toDateString()) ?? 0,
      }))
    );
  };

  const fetchRecentActivity = async (userId: string) => {
    const [papersRes, syllabiRes] = await Promise.all([
      supabase
        .from("question_papers")
        .select("title, status, created_at")
        .eq("created_by", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("syllabi")
        .select("subject, status, created_at")
        .eq("uploaded_by", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const items: (ActivityItem & { createdAt: string })[] = [];

    for (const p of papersRes.data ?? []) {
      items.push({
        title: `Generated question paper: ${p.title}`,
        time: timeAgo(p.created_at),
        status: p.status === "final" ? "success" : "info",
        createdAt: p.created_at,
      });
    }

    for (const s of syllabiRes.data ?? []) {
      items.push({
        title: `Uploaded syllabus for ${s.subject ?? "Untitled subject"}`,
        time: timeAgo(s.created_at),
        status: s.status === "error" ? "warning" : s.status === "parsed" ? "success" : "info",
        createdAt: s.created_at,
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setRecentActivity(items.slice(0, 5).map(({ createdAt, ...rest }) => rest));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {profile?.full_name || "User"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloom's Taxonomy Distribution */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold">Bloom's Taxonomy Distribution</h2>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {bloomData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              {loading ? "Loading…" : "No questions available for this selection."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bloomData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {bloomData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Syllabus Coverage Analysis with Subject Filter Dropdown */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold">Syllabus Coverage Analysis</h2>
            <select
              value={coverageSubjectId}
              onChange={(e) => setCoverageSubjectId(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {coverageData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              {loading ? "Loading…" : "Upload a syllabus to see unit coverage."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={coverageData}
                margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="displayTitle"
                  interval={0}
                  tick={{ fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as UnitCoveragePoint;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-md max-w-xs">
                          <p className="text-xs font-semibold text-foreground">
                            Unit {data.unitNumber}: {data.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Questions: <span className="font-bold text-primary">{data.questionCount}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="questionCount" fill="#2563EB" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Weekly Activity and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Weekly Activity</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="papers"
                stroke="#2563EB"
                strokeWidth={2}
                dot={{ fill: "#2563EB" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading…"
                : "No activity yet — upload a syllabus or generate a paper to get started."}
            </p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {activity.status === "success" && (
                      <CheckCircle className="w-5 h-5 text-success" />
                    )}
                    {activity.status === "warning" && (
                      <AlertCircle className="w-5 h-5 text-warning" />
                    )}
                    {activity.status === "info" && (
                      <Clock className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/app/ai-generator")}
            className="p-4 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <Sparkles className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold">Generate Questions</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Use AI to create new questions
            </p>
          </button>
          <button
            onClick={() => navigate("/app/syllabus")}
            className="p-4 border border-border rounded-xl hover:border-secondary hover:bg-secondary/5 transition-all text-left"
          >
            <BookOpen className="w-6 h-6 text-secondary mb-2" />
            <h3 className="font-semibold">Upload Syllabus</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add new course syllabus
            </p>
          </button>
          <button
            onClick={() => navigate("/app/paper-builder")}
            className="p-4 border border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all text-left"
          >
            <FileText className="w-6 h-6 text-accent mb-2" />
            <h3 className="font-semibold">Build Paper</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create question paper
            </p>
          </button>
          <button
            onClick={() => navigate("/app/coverage-analyzer")}
            className="p-4 border border-border rounded-xl hover:border-success hover:bg-success/5 transition-all text-left"
          >
            <TrendingUp className="w-6 h-6 text-success mb-2" />
            <h3 className="font-semibold">View Analytics</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Detailed insights
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}