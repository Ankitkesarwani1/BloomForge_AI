import { useEffect, useState } from "react";
import {
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BookOpen,
  Lightbulb,
  Loader2,
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
import { supabase } from "../../lib/supabase";

interface SubjectOption {
  id: string;
  name: string;
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

export function CoverageAnalyzerPage() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // Calculated Metrics
  const [overallCoverage, setOverallCoverage] = useState<number>(0);
  const [highCoverageUnits, setHighCoverageUnits] = useState<number>(0);
  const [lowCoverageUnits, setLowCoverageUnits] = useState<number>(0);
  const [coverageScore, setCoverageScore] = useState<string>("–");

  // Chart & Heatmap Data
  const [unitCoverageData, setUnitCoverageData] = useState<UnitCoverageData[]>([]);
  const [topicCoverageData, setTopicCoverageData] = useState<TopicCoverageData[]>([]);
  const [radarData, setRadarData] = useState<RadarDataPoint[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // 1. Initial Load: Fetch Available Subjects
  useEffect(() => {
    fetchSubjects();
  }, []);

  // 2. Fetch Coverage Data when Selected Subject Changes
  useEffect(() => {
    if (selectedSubjectId) {
      fetchSubjectCoverageData(selectedSubjectId);
    }
  }, [selectedSubjectId]);

  const fetchSubjects = async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoading(false);
      return;
    }

    const { data: syllabi } = await supabase
      .from("syllabi")
      .select("subject_id, subject")
      .eq("uploaded_by", userData.user.id);

    const uniqueSubjectsMap = new Map<string, string>();
    (syllabi ?? []).forEach((s) => {
      if (s.subject_id) {
        uniqueSubjectsMap.set(s.subject_id, s.subject || "Unnamed Subject");
      }
    });

    const subjectList: SubjectOption[] = Array.from(uniqueSubjectsMap.entries()).map(
      ([id, name]) => ({ id, name })
    );

    setSubjects(subjectList);

    if (subjectList.length > 0) {
      setSelectedSubjectId(subjectList[0].id);
    } else {
      setLoading(false);
    }
  };

  const fetchSubjectCoverageData = async (subjectId: string) => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoading(false);
      return;
    }
    const userId = userData.user.id;

    // Fetch Syllabus IDs mapped to this subject
    const { data: syllabi } = await supabase
      .from("syllabi")
      .select("id")
      .eq("uploaded_by", userId)
      .eq("subject_id", subjectId);

    const syllabusIds = (syllabi ?? []).map((s) => s.id);

    if (syllabusIds.length === 0) {
      resetMetrics();
      setLoading(false);
      return;
    }

    // Fetch Units for this syllabus
    const { data: units } = await supabase
      .from("units")
      .select("id, unit_number, title, hours")
      .in("syllabus_id", syllabusIds)
      .order("unit_number", { ascending: true });

    if (!units || units.length === 0) {
      resetMetrics();
      setLoading(false);
      return;
    }

    // Fetch Questions by subject_id directly
    const { data: questions } = await supabase
      .from("questions")
      .select("id, unit_id, bloom_level")
      .eq("created_by", userId)
      .eq("subject_id", subjectId);

    const allQuestions = questions ?? [];

    // --- 1. Unit-wise Coverage Calculation ---
    // Benchmark target: 5 questions per unit = 100% target coverage
    const TARGET_PER_UNIT = 5;
    let totalCoverageSum = 0;
    let highUnits = 0;
    let lowUnits = 0;

    const unitChartData: UnitCoverageData[] = units.map((u) => {
      // Aggregate questions strictly by unit_id
      const qCount = allQuestions.filter((q) => q.unit_id === u.id).length;
      const covPercentage = Math.min(100, Math.round((qCount / TARGET_PER_UNIT) * 100));

      totalCoverageSum += covPercentage;
      if (covPercentage >= 80) highUnits++;
      if (covPercentage < 60) lowUnits++;

      return {
        unit: `Unit ${u.unit_number}`,
        unitNumber: u.unit_number,
        coverage: covPercentage,
        questions: qCount,
        target: 100,
      };
    });

    setUnitCoverageData(unitChartData);

    const avgCoverage = Math.round(totalCoverageSum / units.length);
    setOverallCoverage(avgCoverage);
    setHighCoverageUnits(highUnits);
    setLowCoverageUnits(lowUnits);

    // Coverage Score Grading
    if (avgCoverage >= 90) setCoverageScore("A+");
    else if (avgCoverage >= 80) setCoverageScore("A");
    else if (avgCoverage >= 70) setCoverageScore("B+");
    else if (avgCoverage >= 60) setCoverageScore("B");
    else if (avgCoverage >= 50) setCoverageScore("C");
    else setCoverageScore("D");

    // --- 2. Topic Coverage Heatmap (Aggregated via unit_id) ---
    const topicChartData: TopicCoverageData[] = units.map((u) => {
      const qCount = allQuestions.filter((q) => q.unit_id === u.id).length;
      const covPct = Math.min(100, Math.round((qCount / TARGET_PER_UNIT) * 100));

      let status: "high" | "good" | "medium" | "low" = "low";
      if (covPct >= 80) status = "high";
      else if (covPct >= 60) status = "good";
      else if (covPct >= 40) status = "medium";

      return {
        topic: u.title ? `Unit ${u.unit_number}: ${u.title}` : `Unit ${u.unit_number}`,
        coverage: covPct,
        questions: qCount,
        status,
      };
    });

    setTopicCoverageData(topicChartData);

    // --- 3. Radar Chart: Cognitive Dimensions Coverage ---
    const bloomCounts: Record<string, number> = {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0,
    };

    allQuestions.forEach((q) => {
      const lvl = q.bloom_level?.toLowerCase()?.trim();
      if (lvl && bloomCounts[lvl] !== undefined) {
        bloomCounts[lvl] += 1;
      }
    });

    const totalQ = allQuestions.length || 1;
    const radarChartData: RadarDataPoint[] = [
      {
        subject: "Knowledge",
        coverage: Math.min(100, Math.round(((bloomCounts.remember + bloomCounts.understand) / (totalQ * 0.35)) * 100)),
        fullMark: 100,
      },
      {
        subject: "Application",
        coverage: Math.min(100, Math.round((bloomCounts.apply / (totalQ * 0.25)) * 100)),
        fullMark: 100,
      },
      {
        subject: "Analysis",
        coverage: Math.min(100, Math.round((bloomCounts.analyze / (totalQ * 0.20)) * 100)),
        fullMark: 100,
      },
      {
        subject: "Synthesis",
        coverage: Math.min(100, Math.round((bloomCounts.create / (totalQ * 0.10)) * 100)),
        fullMark: 100,
      },
      {
        subject: "Evaluation",
        coverage: Math.min(100, Math.round((bloomCounts.evaluate / (totalQ * 0.10)) * 100)),
        fullMark: 100,
      },
    ];

    setRadarData(radarChartData);

    // --- 4. Dynamic AI Recommendations ---
    const generatedRecs: Recommendation[] = [];

    // Low Coverage Unit Alerts
    units.forEach((u) => {
      const qCount = allQuestions.filter((q) => q.unit_id === u.id).length;
      const covPercentage = Math.min(100, Math.round((qCount / TARGET_PER_UNIT) * 100));

      if (covPercentage < 60) {
        const needed = TARGET_PER_UNIT - qCount;
        generatedRecs.push({
          title: `Low Coverage Alert: Unit ${u.unit_number}`,
          description: `"${u.title || "Untitled Unit"}" has only ${qCount} question(s) (${covPercentage}% coverage). Add ${Math.max(1, needed)} more question(s).`,
          priority: qCount === 0 ? "high" : "medium",
        });
      } else if (covPercentage >= 80) {
        generatedRecs.push({
          title: `Sufficient Coverage: Unit ${u.unit_number}`,
          description: `"${u.title || "Untitled Unit"}" reaches optimal question density (${covPercentage}%).`,
          priority: "low",
        });
      }
    });

    if (generatedRecs.length === 0) {
      generatedRecs.push({
        title: "Balanced Syllabus Coverage",
        description: "All units meet the minimum required question density benchmark.",
        priority: "low",
      });
    }

    setRecommendations(generatedRecs.slice(0, 4));
    setLoading(false);
  };

  const resetMetrics = () => {
    setOverallCoverage(0);
    setHighCoverageUnits(0);
    setLowCoverageUnits(0);
    setCoverageScore("N/A");
    setUnitCoverageData([]);
    setTopicCoverageData([]);
    setRadarData([]);
    setRecommendations([]);
  };

  const getStatusColor = (coverage: number) => {
    if (coverage >= 80) return "#10B981";
    if (coverage >= 50) return "#F59E0B";
    return "#EF4444";
  };

  const selectedSubjectName =
    subjects.find((s) => s.id === selectedSubjectId)?.name || "Select Subject";

  return (
    <div className="space-y-6">
      {/* Header & Subject Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Syllabus Coverage Analyzer</h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze question distribution across units
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
          <p className="text-sm text-muted-foreground">Analyzing unit database...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Syllabi Uploaded</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a syllabus to track unit question coverage.
          </p>
        </div>
      ) : (
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
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${overallCoverage}%` }}
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Coverage Units</p>
                  <p className="text-3xl font-bold mt-2">
                    {highCoverageUnits}/{unitCoverageData.length}
                  </p>
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

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unit Coverage Chart */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
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
                                Coverage:{" "}
                                <span className="font-bold text-primary">{data.coverage}%</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Questions mapped:{" "}
                                <span className="font-bold">{data.questions}</span>
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
                        <Cell
                          key={`cell-${entry.unit}`}
                          fill={getStatusColor(entry.coverage)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Radar Chart */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
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
                    <Radar
                      name="Coverage"
                      dataKey="coverage"
                      stroke="#2563EB"
                      fill="#2563EB"
                      fillOpacity={0.6}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Unit Coverage Heatmap */}
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
                    style={{
                      background: `linear-gradient(135deg, ${getStatusColor(
                        item.coverage
                      )}15, ${getStatusColor(item.coverage)}05)`,
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <BookOpen
                        className="w-5 h-5"
                        style={{ color: getStatusColor(item.coverage) }}
                      />
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full text-white"
                        style={{ background: getStatusColor(item.coverage) }}
                      >
                        {item.coverage}%
                      </span>
                    </div>
                    <h3 className="font-semibold truncate" title={item.topic}>
                      {item.topic}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.questions} question(s) mapped
                    </p>
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${item.coverage}%`,
                          background: getStatusColor(item.coverage),
                        }}
                      />
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
                      <p className="text-sm text-muted-foreground mt-1">
                        {rec.description}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full uppercase ${
                        rec.priority === "high"
                          ? "bg-destructive text-destructive-foreground"
                          : rec.priority === "medium"
                          ? "bg-warning text-white"
                          : "bg-success text-white"
                      }`}
                    >
                      {rec.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}