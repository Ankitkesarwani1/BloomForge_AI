import { useState } from "react";
import {
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BookOpen,
  Lightbulb,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const subjects = ["Data Structures", "Operating Systems", "Database Management", "Computer Networks", "Machine Learning"];

const unitCoverageData = [
  { unit: "Unit 1", coverage: 95, questions: 42, target: 90 },
  { unit: "Unit 2", coverage: 88, questions: 38, target: 90 },
  { unit: "Unit 3", coverage: 72, questions: 28, target: 90 },
  { unit: "Unit 4", coverage: 91, questions: 40, target: 90 },
  { unit: "Unit 5", coverage: 85, questions: 35, target: 90 },
  { unit: "Unit 6", coverage: 67, questions: 25, target: 90 },
];

const topicCoverageData = [
  { topic: "Arrays & Strings", coverage: 95, status: "high" },
  { topic: "Linked Lists", coverage: 88, status: "good" },
  { topic: "Stacks & Queues", coverage: 72, status: "medium" },
  { topic: "Trees", coverage: 91, status: "high" },
  { topic: "Graphs", coverage: 67, status: "low" },
  { topic: "Sorting Algorithms", coverage: 85, status: "good" },
  { topic: "Searching Algorithms", coverage: 79, status: "medium" },
  { topic: "Dynamic Programming", coverage: 58, status: "low" },
];

const radarData = [
  { subject: "Knowledge", coverage: 92, fullMark: 100 },
  { subject: "Application", coverage: 75, fullMark: 100 },
  { subject: "Analysis", coverage: 68, fullMark: 100 },
  { subject: "Synthesis", coverage: 81, fullMark: 100 },
  { subject: "Evaluation", coverage: 72, fullMark: 100 },
];

const recommendations = [
  {
    title: "Low Coverage Alert: Unit 6",
    description: "Only 67% coverage. Recommend adding 8-10 more questions.",
    priority: "high",
  },
  {
    title: "Topic Gap: Dynamic Programming",
    description: "Critical topic with only 58% coverage. Add case study questions.",
    priority: "high",
  },
  {
    title: "Balanced Distribution Needed",
    description: "Unit 3 and Unit 6 need more questions to match other units.",
    priority: "medium",
  },
  {
    title: "Good Progress: Unit 1 & Unit 4",
    description: "Excellent coverage achieved. Maintain this level.",
    priority: "low",
  },
];

export function CoverageAnalyzerPage() {
  const [selectedSubject, setSelectedSubject] = useState("Data Structures");

  const getStatusColor = (coverage: number) => {
    if (coverage >= 85) return "#10B981";
    if (coverage >= 70) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Syllabus Coverage Analyzer</h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze coverage across units and topics
          </p>
        </div>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Coverage Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Coverage</p>
              <p className="text-3xl font-bold mt-2">83%</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10">
              <Target className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: "83%" }} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">High Coverage Units</p>
              <p className="text-3xl font-bold mt-2">3/6</p>
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
              <p className="text-3xl font-bold mt-2">2</p>
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
              <p className="text-3xl font-bold mt-2">B+</p>
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
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Unit-wise Coverage</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={unitCoverageData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="unit" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="target" fill="#e5e7eb" radius={[8, 8, 0, 0]} />
              <Bar dataKey="coverage" radius={[8, 8, 0, 0]}>
                {unitCoverageData.map((entry) => (
                  <Cell key={`cell-${entry.unit}`} fill={getStatusColor(entry.coverage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Coverage Distribution</h2>
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
        </div>
      </div>

      {/* Topic Coverage Heatmap */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Topic Coverage Heatmap</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {topicCoverageData.map((topic, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-border hover:shadow-md transition-shadow"
              style={{
                background: `linear-gradient(135deg, ${getStatusColor(
                  topic.coverage
                )}15, ${getStatusColor(topic.coverage)}05)`,
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <BookOpen
                  className="w-5 h-5"
                  style={{ color: getStatusColor(topic.coverage) }}
                />
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{
                    background: getStatusColor(topic.coverage),
                    color: "white",
                  }}
                >
                  {topic.coverage}%
                </span>
              </div>
              <h3 className="font-semibold">{topic.topic}</h3>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${topic.coverage}%`,
                    background: getStatusColor(topic.coverage),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
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
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{rec.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    rec.priority === "high"
                      ? "bg-destructive text-destructive-foreground"
                      : rec.priority === "medium"
                      ? "bg-warning text-white"
                      : "bg-success text-white"
                  }`}
                >
                  {rec.priority.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Coverage Table */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Detailed Unit Analysis</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3">Unit</th>
                <th className="text-left p-3">Coverage</th>
                <th className="text-left p-3">Questions</th>
                <th className="text-left p-3">Target</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {unitCoverageData.map((unit, index) => (
                <tr key={index} className="border-b border-border hover:bg-accent/50">
                  <td className="p-3 font-semibold">{unit.unit}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${unit.coverage}%`,
                            background: getStatusColor(unit.coverage),
                          }}
                        />
                      </div>
                      <span className="font-semibold">{unit.coverage}%</span>
                    </div>
                  </td>
                  <td className="p-3">{unit.questions}</td>
                  <td className="p-3">{unit.target}%</td>
                  <td className="p-3">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ background: getStatusColor(unit.coverage) }}
                    >
                      {unit.coverage >= 85 ? "Good" : unit.coverage >= 70 ? "Medium" : "Low"}
                    </span>
                  </td>
                  <td className="p-3">
                    <button className="text-primary hover:underline">
                      {unit.coverage < 85 ? "Add Questions" : "View Details"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
