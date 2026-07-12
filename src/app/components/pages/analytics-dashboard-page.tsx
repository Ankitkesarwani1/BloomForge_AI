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
  Users,
  FileText,
  Sparkles,
  Award,
  Clock,
  Target,
  BookOpen,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useState } from "react";

const facultyUsageData = [
  { name: "Dr. Sarah Johnson", papers: 45, questions: 320, aiUsage: 85 },
  { name: "Prof. Michael Chen", papers: 38, questions: 280, aiUsage: 92 },
  { name: "Dr. Emily Davis", papers: 42, questions: 305, aiUsage: 78 },
  { name: "Prof. Robert Wilson", papers: 35, questions: 250, aiUsage: 88 },
  { name: "Dr. Lisa Anderson", papers: 40, questions: 290, aiUsage: 95 },
];

const monthlyTrendData = [
  { month: "Jan", papers: 28, questions: 185, quality: 78 },
  { month: "Feb", papers: 35, questions: 240, quality: 82 },
  { month: "Mar", papers: 42, questions: 310, quality: 85 },
  { month: "Apr", papers: 38, questions: 275, quality: 83 },
  { month: "May", papers: 45, questions: 330, quality: 88 },
  { month: "Jun", papers: 52, questions: 385, quality: 90 },
];

const topicPopularityData = [
  { topic: "Data Structures", count: 145, color: "#2563EB" },
  { topic: "Algorithms", count: 128, color: "#7C3AED" },
  { topic: "Databases", count: 112, color: "#06B6D4" },
  { topic: "Networks", count: 98, color: "#10B981" },
  { topic: "OS Concepts", count: 85, color: "#F59E0B" },
  { topic: "Machine Learning", count: 72, color: "#EF4444" },
];

const bloomDistributionData = [
  { level: "Remember", count: 180, percentage: 20 },
  { level: "Understand", count: 225, percentage: 25 },
  { level: "Apply", count: 198, percentage: 22 },
  { level: "Analyze", count: 144, percentage: 16 },
  { level: "Evaluate", count: 90, percentage: 10 },
  { level: "Create", count: 63, percentage: 7 },
];

const aiPerformanceData = [
  { metric: "Generation Speed", value: 95 },
  { metric: "Quality Score", value: 88 },
  { metric: "Accuracy", value: 92 },
  { metric: "Relevance", value: 90 },
  { metric: "Diversity", value: 85 },
];

export function AnalyticsDashboardPage() {
  const [timeRange, setTimeRange] = useState("last-6-months");

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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Papers Generated</p>
              <p className="text-3xl font-bold mt-2">240</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm text-success">+12.5%</span>
              </div>
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
              <p className="text-3xl font-bold mt-2">42</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm text-success">+8.2%</span>
              </div>
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
              <p className="text-3xl font-bold mt-2">1,847</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm text-success">+24.3%</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-accent/10">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Quality Score</p>
              <p className="text-3xl font-bold mt-2">88%</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm text-success">+5.8%</span>
              </div>
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
            <AreaChart data={monthlyTrendData}>
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
          <h2 className="text-xl font-semibold mb-4">Quality Score Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="quality"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: "#10B981", r: 5 }}
                name="Quality Score (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Faculty Usage and Topic Popularity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Faculty Usage Statistics</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={facultyUsageData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="papers" fill="#2563EB" radius={[0, 8, 8, 0]} name="Papers" />
              <Bar dataKey="aiUsage" fill="#7C3AED" radius={[0, 8, 8, 0]} name="AI Usage %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Most Generated Topics</h2>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={topicPopularityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ topic, percentage }) => `${topic}: ${percentage}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="count"
              >
                {topicPopularityData.map((entry) => (
                  <Cell key={`cell-${entry.topic}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bloom's Distribution and AI Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Bloom's Taxonomy Distribution</h2>
          <div className="space-y-4">
            {bloomDistributionData.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{item.level}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.count} questions ({item.percentage}%)
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                    style={{ width: `${item.percentage * 4}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">AI Generation Performance</h2>
          <div className="space-y-4">
            {aiPerformanceData.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{item.metric}</span>
                  <span className="text-sm font-semibold text-primary">{item.value}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-success transition-all duration-300"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-warning" />
          <h2 className="text-xl font-semibold">Recent Achievements & Milestones</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl">
            <Target className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-semibold">1000+ Questions</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Reached milestone of 1000 AI-generated questions
            </p>
            <p className="text-xs text-muted-foreground mt-2">2 days ago</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-xl">
            <BookOpen className="w-8 h-8 text-success mb-2" />
            <h3 className="font-semibold">50 Subjects Covered</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Expanded to cover 50 different subjects
            </p>
            <p className="text-xs text-muted-foreground mt-2">1 week ago</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 rounded-xl">
            <Clock className="w-8 h-8 text-secondary mb-2" />
            <h3 className="font-semibold">500+ Hours Saved</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Saved faculty over 500 hours in paper creation
            </p>
            <p className="text-xs text-muted-foreground mt-2">This month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
