import { useEffect, useState, useCallback } from "react";
import {
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BookOpen,
  Lightbulb,
  Loader2,
  CalendarDays,
  Clock,
  ClipboardList,
  BarChart2,
  Save,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SubjectOption {
  id: string;
  name: string;
}

interface UnitRow {
  id: string;
  unit_number: number;
  title: string;
  hours: number | null;
}

interface CoverageProgress {
  unit_id: string;
  completed: boolean;
  completed_date: string; // ISO date string "YYYY-MM-DD"
  lecture_hours: number | string;
}

interface UnitCoverageData {
  unit: string;
  unitNumber: number;
  coverage: number;
  questions: number;
  target: number;
}

interface TopicCoverageData {
  topic: string;
  coverage: number;
  questions: number;
  status: "high" | "good" | "medium" | "low";
}

interface RadarDataPoint {
  subject: string;
  coverage: number;
  fullMark: number;
}

interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CoverageAnalyzerPage() {
  const [activeTab, setActiveTab] = useState<"tracking" | "analytics">("tracking");
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Lecture tracking state — keyed by unit_id
  const [progressMap, setProgressMap] = useState<Record<string, CoverageProgress>>({});
  const [savingProgress, setSavingProgress] = useState(false);

  // Analytics state
  const [overallCoverage, setOverallCoverage] = useState<number>(0);
  const [highCoverageUnits, setHighCoverageUnits] = useState<number>(0);
  const [lowCoverageUnits, setLowCoverageUnits] = useState<number>(0);
  const [coverageScore, setCoverageScore] = useState<string>("–");
  const [unitCoverageData, setUnitCoverageData] = useState<UnitCoverageData[]>([]);
  const [topicCoverageData, setTopicCoverageData] = useState<TopicCoverageData[]>([]);
  const [radarData, setRadarData] = useState<RadarDataPoint[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // ── 1. Get user id & subjects ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id ?? null;
      setUserId(uid);
      if (!uid) { setLoading(false); return; }

      // Check user profile for assigned_subject
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, assigned_subject, assigned_subject_id")
        .eq("id", uid)
        .single();

      // Fetch all uploaded syllabi from syllabi table
      const { data: syllabi } = await supabase
        .from("syllabi")
        .select("id, subject_id, subject, code, uploaded_by");

      const map = new Map<string, string>();
      (syllabi ?? []).forEach((s) => {
        const key = s.subject_id || s.id;
        if (key) map.set(key, s.subject || "Unnamed Subject");
      });

      const list: SubjectOption[] = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
      setSubjects(list);

      // Faculty-subject assignment scoping: if user has assigned subject, auto-select it
      if (profile?.assigned_subject || profile?.assigned_subject_id) {
        const assignedName = (profile.assigned_subject || "").toLowerCase().trim();
        const matched = list.find(
          (item) =>
            item.id === profile.assigned_subject_id ||
            item.name.toLowerCase() === assignedName ||
            item.name.toLowerCase().includes(assignedName)
        );
        if (matched) {
          setSelectedSubjectId(matched.id);
        } else if (list.length > 0) {
          setSelectedSubjectId(list[0].id);
        } else {
          setLoading(false);
        }
      } else if (list.length > 0) {
        setSelectedSubjectId(list[0].id);
      } else {
        setLoading(false);
      }
    })();
  }, []);

  // ── 2. Load units + progress + analytics whenever subject changes ───────────
  useEffect(() => {
    if (!selectedSubjectId || !userId) return;
    fetchAllData(selectedSubjectId, userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId, userId]);

  const fetchAllData = useCallback(async (subjectId: string, uid: string) => {
    setLoading(true);

    // Get syllabi ids for this subject (by subject_id or direct syllabus id)
    const { data: syllabi } = await supabase
      .from("syllabi")
      .select("id")
      .or(`subject_id.eq.${subjectId},id.eq.${subjectId}`);

    const syllabusIds = (syllabi ?? []).map((s) => s.id);

    if (syllabusIds.length === 0) {
      setUnits([]);
      setProgressMap({});
      resetMetrics();
      setLoading(false);
      return;
    }

    // Units
    const { data: unitData } = await supabase
      .from("units")
      .select("id, unit_number, title, hours")
      .in("syllabus_id", syllabusIds)
      .order("unit_number", { ascending: true });

    const fetchedUnits: UnitRow[] = (unitData ?? []).map((u) => ({
      id: u.id,
      unit_number: u.unit_number,
      title: u.title || `Unit ${u.unit_number}`,
      hours: u.hours ?? null,
    }));
    setUnits(fetchedUnits);

    if (fetchedUnits.length === 0) {
      setProgressMap({});
      resetMetrics();
      setLoading(false);
      return;
    }

    // Progress records
    const unitIds = fetchedUnits.map((u) => u.id);
    const { data: progressData } = await supabase
      .from("coverage_progress")
      .select("unit_id, completed, completed_date, lecture_hours")
      .eq("user_id", uid)
      .in("unit_id", unitIds);

    const pMap: Record<string, CoverageProgress> = {};
    (progressData ?? []).forEach((row) => {
      pMap[row.unit_id] = {
        unit_id: row.unit_id,
        completed: row.completed ?? false,
        completed_date: row.completed_date ?? "",
        lecture_hours: row.lecture_hours ?? "",
      };
    });
    // Initialise missing units with defaults
    fetchedUnits.forEach((u) => {
      if (!pMap[u.id]) {
        pMap[u.id] = { unit_id: u.id, completed: false, completed_date: "", lecture_hours: "" };
      }
    });
    setProgressMap(pMap);

    // Analytics – questions
    const { data: questions } = await supabase
      .from("questions")
      .select("id, unit_id, bloom_level")
      .eq("created_by", uid)
      .eq("subject_id", subjectId);

    const allQuestions = questions ?? [];
    computeAnalytics(fetchedUnits, allQuestions);
    setLoading(false);
  }, []);

  const computeAnalytics = (unitList: UnitRow[], allQuestions: any[]) => {
    const TARGET_PER_UNIT = 5;
    let totalCoverageSum = 0;
    let highUnits = 0;
    let lowUnits = 0;

    const unitChartData: UnitCoverageData[] = unitList.map((u) => {
      const qCount = allQuestions.filter((q) => q.unit_id === u.id).length;
      const covPct = Math.min(100, Math.round((qCount / TARGET_PER_UNIT) * 100));
      totalCoverageSum += covPct;
      if (covPct >= 80) highUnits++;
      if (covPct < 60) lowUnits++;
      return { unit: `Unit ${u.unit_number}`, unitNumber: u.unit_number, coverage: covPct, questions: qCount, target: 100 };
    });

    setUnitCoverageData(unitChartData);

    const avg = unitList.length > 0 ? Math.round(totalCoverageSum / unitList.length) : 0;
    setOverallCoverage(avg);
    setHighCoverageUnits(highUnits);
    setLowCoverageUnits(lowUnits);

    if (avg >= 90) setCoverageScore("A+");
    else if (avg >= 80) setCoverageScore("A");
    else if (avg >= 70) setCoverageScore("B+");
    else if (avg >= 60) setCoverageScore("B");
    else if (avg >= 50) setCoverageScore("C");
    else setCoverageScore("D");

    const topicChartData: TopicCoverageData[] = unitList.map((u) => {
      const qCount = allQuestions.filter((q) => q.unit_id === u.id).length;
      const covPct = Math.min(100, Math.round((qCount / TARGET_PER_UNIT) * 100));
      let status: "high" | "good" | "medium" | "low" = "low";
      if (covPct >= 80) status = "high";
      else if (covPct >= 60) status = "good";
      else if (covPct >= 40) status = "medium";
      return { topic: u.title ? `Unit ${u.unit_number}: ${u.title}` : `Unit ${u.unit_number}`, coverage: covPct, questions: qCount, status };
    });
    setTopicCoverageData(topicChartData);

    const bloomCounts: Record<string, number> = { remember: 0, understand: 0, apply: 0, analyze: 0, evaluate: 0, create: 0 };
    allQuestions.forEach((q) => {
      const lvl = q.bloom_level?.toLowerCase()?.trim();
      if (lvl && bloomCounts[lvl] !== undefined) bloomCounts[lvl] += 1;
    });

    const totalQ = allQuestions.length || 1;
    setRadarData([
      { subject: "Knowledge", coverage: Math.min(100, Math.round(((bloomCounts.remember + bloomCounts.understand) / (totalQ * 0.35)) * 100)), fullMark: 100 },
      { subject: "Application", coverage: Math.min(100, Math.round((bloomCounts.apply / (totalQ * 0.25)) * 100)), fullMark: 100 },
      { subject: "Analysis", coverage: Math.min(100, Math.round((bloomCounts.analyze / (totalQ * 0.20)) * 100)), fullMark: 100 },
      { subject: "Synthesis", coverage: Math.min(100, Math.round((bloomCounts.create / (totalQ * 0.10)) * 100)), fullMark: 100 },
      { subject: "Evaluation", coverage: Math.min(100, Math.round((bloomCounts.evaluate / (totalQ * 0.10)) * 100)), fullMark: 100 },
    ]);

    const generatedRecs: Recommendation[] = [];
    unitList.forEach((u) => {
      const qCount = allQuestions.filter((q) => q.unit_id === u.id).length;
      const covPct = Math.min(100, Math.round((qCount / TARGET_PER_UNIT) * 100));
      if (covPct < 60) {
        generatedRecs.push({ title: `Low Coverage Alert: Unit ${u.unit_number}`, description: `"${u.title || "Untitled Unit"}" has only ${qCount} question(s) (${covPct}% coverage). Add ${Math.max(1, TARGET_PER_UNIT - qCount)} more question(s).`, priority: qCount === 0 ? "high" : "medium" });
      } else if (covPct >= 80) {
        generatedRecs.push({ title: `Sufficient Coverage: Unit ${u.unit_number}`, description: `"${u.title || "Untitled Unit"}" reaches optimal question density (${covPct}%).`, priority: "low" });
      }
    });
    if (generatedRecs.length === 0) {
      generatedRecs.push({ title: "Balanced Syllabus Coverage", description: "All units meet the minimum required question density benchmark.", priority: "low" });
    }
    setRecommendations(generatedRecs.slice(0, 4));
  };

  const resetMetrics = () => {
    setOverallCoverage(0); setHighCoverageUnits(0); setLowCoverageUnits(0);
    setCoverageScore("N/A"); setUnitCoverageData([]); setTopicCoverageData([]);
    setRadarData([]); setRecommendations([]);
  };

  // ── Progress field handlers ────────────────────────────────────────────────
  const setUnitCompleted = (unitId: string, checked: boolean) => {
    setProgressMap((prev) => ({
      ...prev,
      [unitId]: {
        ...prev[unitId],
        completed: checked,
        completed_date: checked && !prev[unitId]?.completed_date
          ? new Date().toISOString().split("T")[0]
          : prev[unitId]?.completed_date ?? "",
      },
    }));
  };

  const setUnitDate = (unitId: string, date: string) => {
    setProgressMap((prev) => ({ ...prev, [unitId]: { ...prev[unitId], completed_date: date } }));
  };

  const setUnitHours = (unitId: string, hours: string) => {
    setProgressMap((prev) => ({ ...prev, [unitId]: { ...prev[unitId], lecture_hours: hours } }));
  };

  // ── Save progress to DB ────────────────────────────────────────────────────
  const handleSaveProgress = async () => {
    if (!userId) { toast.error("You must be signed in."); return; }
    setSavingProgress(true);

    const rows = Object.values(progressMap).map((p) => ({
      user_id: userId,
      unit_id: p.unit_id,
      completed: p.completed,
      completed_date: p.completed_date || null,
      lecture_hours: p.lecture_hours !== "" ? Number(p.lecture_hours) : null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("coverage_progress")
      .upsert(rows, { onConflict: "user_id,unit_id" });

    setSavingProgress(false);
    if (error) {
      toast.error("Failed to save progress: " + error.message);
    } else {
      toast.success("Lecture progress saved!");
    }
  };

  const getStatusColor = (coverage: number) => {
    if (coverage >= 80) return "#10B981";
    if (coverage >= 50) return "#F59E0B";
    return "#EF4444";
  };

  const selectedSubjectName = subjects.find((s) => s.id === selectedSubjectId)?.name || "Select Subject";

  // ── Derived stats for tracking tab ────────────────────────────────────────
  const completedCount = Object.values(progressMap).filter((p) => p.completed).length;
  const totalHours = Object.values(progressMap)
    .reduce((sum, p) => sum + (Number(p.lecture_hours) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Subject Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Syllabus Coverage Analyzer</h1>
          <p className="text-muted-foreground mt-1">
            Track lecture completion and analyze question distribution across units
          </p>
        </div>
        {subjects.length > 0 && (
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="w-64 bg-background">
              <SelectValue>{selectedSubjectName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading syllabus data...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Syllabi Uploaded</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a syllabus in Syllabus Management to start tracking coverage.
          </p>
        </div>
      ) : (
        <>
          {/* Tab Bar */}
          <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("tracking")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "tracking"
                  ? "bg-card shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Lecture Tracking
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "analytics"
                  ? "bg-card shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Question Analytics
            </button>
          </div>

          {/* ── LECTURE TRACKING TAB ── */}
          {activeTab === "tracking" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Units</p>
                    <p className="text-2xl font-bold">{units.length}</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-success/10">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Units Completed</p>
                    <p className="text-2xl font-bold">{completedCount} / {units.length}</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <Clock className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Lecture Hours</p>
                    <p className="text-2xl font-bold">{totalHours > 0 ? totalHours.toFixed(1) : "—"}</p>
                  </div>
                </div>
              </div>

              {/* Unit Checklist */}
              {units.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
                  No units found for this subject.
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/40 border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <div className="col-span-1 flex justify-center">Done</div>
                    <div className="col-span-5">Chapter / Unit</div>
                    <div className="col-span-3 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" /> Completed Date
                    </div>
                    <div className="col-span-3 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Lecture Hours
                    </div>
                  </div>

                  {units.map((unit, idx) => {
                    const prog = progressMap[unit.id];
                    const isCompleted = prog?.completed ?? false;
                    return (
                      <div
                        key={unit.id}
                        className={`grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-border last:border-b-0 transition-colors ${
                          isCompleted ? "bg-success/5" : idx % 2 === 0 ? "bg-background" : "bg-card"
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="col-span-1 flex justify-center">
                          <div
                            onClick={() => setUnitCompleted(unit.id, !isCompleted)}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                              isCompleted
                                ? "bg-success border-success"
                                : "border-border hover:border-primary"
                            }`}
                          >
                            {isCompleted && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Unit title */}
                        <div className="col-span-5">
                          <p className={`font-medium text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                            Unit {unit.unit_number}: {unit.title}
                          </p>
                          {unit.hours && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Syllabus hours: {unit.hours}h
                            </p>
                          )}
                        </div>

                        {/* Date input */}
                        <div className="col-span-3">
                          <input
                            type="date"
                            value={prog?.completed_date ?? ""}
                            onChange={(e) => setUnitDate(unit.id, e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        {/* Hours input */}
                        <div className="col-span-3">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={prog?.lecture_hours ?? ""}
                            onChange={(e) => setUnitHours(unit.id, e.target.value)}
                            placeholder="e.g. 4.5"
                            className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Progress bar */}
              {units.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">Overall Completion</p>
                    <p className="text-sm font-bold text-primary">{Math.round((completedCount / units.length) * 100)}%</p>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500 rounded-full"
                      style={{ width: `${Math.round((completedCount / units.length) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {completedCount} of {units.length} units marked as completed
                  </p>
                </div>
              )}

              {/* Save button */}
              <div className="flex justify-end">
                <Button onClick={handleSaveProgress} disabled={savingProgress || units.length === 0}>
                  {savingProgress ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save Progress</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeTab === "analytics" && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Coverage</p>
                      <p className="text-3xl font-bold mt-2">{overallCoverage}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${overallCoverage}%` }} />
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">High Coverage Units</p>
                      <p className="text-3xl font-bold mt-2">{highCoverageUnits}/{unitCoverageData.length}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-success/10">
                      <CheckCircle className="w-6 h-6 text-success" />
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Low Coverage Units</p>
                      <p className="text-3xl font-bold mt-2">{lowCoverageUnits}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-warning/10">
                      <AlertTriangle className="w-6 h-6 text-warning" />
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Coverage Score</p>
                      <p className="text-3xl font-bold mt-2">{coverageScore}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-accent/10">
                      <TrendingUp className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Unit Coverage Bar Chart */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Unit-wise Coverage</h2>
                  {unitCoverageData.length === 0 ? (
                    <div className="h-[350px] flex items-center justify-center text-sm text-muted-foreground">
                      No units recorded for this subject.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={unitCoverageData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="unit" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as UnitCoverageData;
                              return (
                                <div className="bg-popover border border-border rounded-lg p-3 shadow-md">
                                  <p className="text-xs font-semibold">{data.unit}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Coverage: <span className="font-bold text-primary">{data.coverage}%</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Questions mapped: <span className="font-bold">{data.questions}</span>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="target" fill="#e5e7eb" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="coverage" radius={[8, 8, 0, 0]}>
                          {unitCoverageData.map((entry) => (
                            <Cell key={`cell-${entry.unit}`} fill={getStatusColor(entry.coverage)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Radar Chart */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Cognitive Skill Distribution</h2>
                  {radarData.length === 0 ? (
                    <div className="h-[350px] flex items-center justify-center text-sm text-muted-foreground">
                      No question distribution available.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Radar name="Coverage" dataKey="coverage" stroke="#2563EB" fill="#2563EB" fillOpacity={0.6} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Heatmap */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Unit Coverage Heatmap</h2>
                {topicCoverageData.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No unit metrics found for this subject.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {topicCoverageData.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-xl border border-border hover:shadow-md transition-shadow"
                        style={{ background: `linear-gradient(135deg, ${getStatusColor(item.coverage)}15, ${getStatusColor(item.coverage)}05)` }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <BookOpen className="w-5 h-5" style={{ color: getStatusColor(item.coverage) }} />
                          <span className="text-xs font-semibold px-2 py-1 rounded-full text-white" style={{ background: getStatusColor(item.coverage) }}>
                            {item.coverage}%
                          </span>
                        </div>
                        <h3 className="font-semibold truncate" title={item.topic}>{item.topic}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{item.questions} question(s) mapped</p>
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full transition-all duration-300" style={{ width: `${item.coverage}%`, background: getStatusColor(item.coverage) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Recommendations */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-warning" />
                  <h2 className="text-xl font-semibold">AI Recommendations</h2>
                </div>
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-l-4 ${
                        rec.priority === "high"
                          ? "border-destructive bg-destructive/5"
                          : rec.priority === "medium"
                          ? "border-warning bg-warning/5"
                          : "border-success bg-success/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold">{rec.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full uppercase ${
                          rec.priority === "high" ? "bg-destructive text-destructive-foreground"
                            : rec.priority === "medium" ? "bg-warning text-white" : "bg-success text-white"
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}