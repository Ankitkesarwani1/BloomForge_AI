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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const stats = [
  { label: "Total Subjects", value: "12", icon: BookOpen, color: "text-primary", bgColor: "bg-primary/10" },
  { label: "Question Papers", value: "48", icon: FileText, color: "text-secondary", bgColor: "bg-secondary/10" },
  { label: "Question Bank", value: "1,247", icon: Database, color: "text-accent", bgColor: "bg-accent/10" },
  { label: "AI Generated", value: "892", icon: Sparkles, color: "text-success", bgColor: "bg-success/10" },
];

const bloomData = [
  { name: "Remember", value: 150, color: "#2563EB" },
  { name: "Understand", value: 180, color: "#7C3AED" },
  { name: "Apply", value: 220, color: "#06B6D4" },
  { name: "Analyze", value: 190, color: "#10B981" },
  { name: "Evaluate", value: 120, color: "#F59E0B" },
  { name: "Create", value: 95, color: "#EF4444" },
];

const coverageData = [
  { unit: "Unit 1", coverage: 95 },
  { unit: "Unit 2", coverage: 88 },
  { unit: "Unit 3", coverage: 72 },
  { unit: "Unit 4", coverage: 91 },
  { unit: "Unit 5", coverage: 85 },
];

const activityData = [
  { date: "Mon", papers: 5 },
  { date: "Tue", papers: 8 },
  { date: "Wed", papers: 6 },
  { date: "Thu", papers: 12 },
  { date: "Fri", papers: 9 },
  { date: "Sat", papers: 4 },
  { date: "Sun", papers: 3 },
];

const recentActivity = [
  { title: "Generated question paper for Data Structures", time: "5 minutes ago", status: "success" },
  { title: "Uploaded syllabus for Machine Learning", time: "1 hour ago", status: "info" },
  { title: "Low coverage detected in Operating Systems Unit 3", time: "2 hours ago", status: "warning" },
  { title: "Added 45 questions to Database Management", time: "3 hours ago", status: "success" },
  { title: "Exported answer key for Computer Networks", time: "5 hours ago", status: "info" },
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, Dr. Sarah Johnson</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
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
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Bloom's Taxonomy Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={bloomData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
        </div>

        {/* Syllabus Coverage */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Syllabus Coverage Analysis</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={coverageData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="unit" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="coverage" fill="#2563EB" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="papers" stroke="#2563EB" strokeWidth={2} dot={{ fill: "#2563EB" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
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
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="p-4 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left">
            <Sparkles className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold">Generate Questions</h3>
            <p className="text-sm text-muted-foreground mt-1">Use AI to create new questions</p>
          </button>
          <button className="p-4 border border-border rounded-xl hover:border-secondary hover:bg-secondary/5 transition-all text-left">
            <BookOpen className="w-6 h-6 text-secondary mb-2" />
            <h3 className="font-semibold">Upload Syllabus</h3>
            <p className="text-sm text-muted-foreground mt-1">Add new course syllabus</p>
          </button>
          <button className="p-4 border border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all text-left">
            <FileText className="w-6 h-6 text-accent mb-2" />
            <h3 className="font-semibold">Build Paper</h3>
            <p className="text-sm text-muted-foreground mt-1">Create question paper</p>
          </button>
          <button className="p-4 border border-border rounded-xl hover:border-success hover:bg-success/5 transition-all text-left">
            <TrendingUp className="w-6 h-6 text-success mb-2" />
            <h3 className="font-semibold">View Analytics</h3>
            <p className="text-sm text-muted-foreground mt-1">Detailed insights</p>
          </button>
        </div>
      </div>
    </div>
  );
}
