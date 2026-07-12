import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

const bloomDistribution = [
  { name: "Remember", value: 150, color: "#2563EB", percentage: 15 },
  { name: "Understand", value: 180, color: "#7C3AED", percentage: 18 },
  { name: "Apply", value: 220, color: "#06B6D4", percentage: 22 },
  { name: "Analyze", value: 190, color: "#10B981", percentage: 19 },
  { name: "Evaluate", value: 120, color: "#F59E0B", percentage: 12 },
  { name: "Create", value: 95, color: "#EF4444", percentage: 9 },
];

const subjectWiseBloom = [
  { subject: "Data Structures", remember: 25, understand: 30, apply: 45, analyze: 35, evaluate: 20, create: 15 },
  { subject: "Machine Learning", remember: 20, understand: 35, apply: 40, analyze: 38, evaluate: 25, create: 18 },
  { subject: "Operating Systems", remember: 30, understand: 28, apply: 35, analyze: 30, evaluate: 18, create: 12 },
  { subject: "Database Mgmt", remember: 28, understand: 32, apply: 38, analyze: 28, evaluate: 22, create: 14 },
];

const radarData = [
  { level: "Remember", current: 150, ideal: 120 },
  { level: "Understand", current: 180, ideal: 200 },
  { level: "Apply", current: 220, ideal: 250 },
  { level: "Analyze", current: 190, ideal: 220 },
  { level: "Evaluate", current: 120, ideal: 150 },
  { level: "Create", current: 95, ideal: 130 },
];

export function BloomAnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bloom's Taxonomy Analytics</h1>
        <p className="text-muted-foreground mt-1">Analyze cognitive level distribution across your question bank</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Most Used Level</h3>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl font-bold">Apply</p>
          <p className="text-sm text-muted-foreground mt-1">22% of total questions</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Least Used Level</h3>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold">Create</p>
          <p className="text-sm text-muted-foreground mt-1">9% of total questions</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Balance Score</h3>
            <AlertCircle className="w-4 h-4 text-warning" />
          </div>
          <p className="text-2xl font-bold">72%</p>
          <p className="text-sm text-muted-foreground mt-1">Needs improvement</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Distribution */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Overall Distribution</h2>
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
          <div className="grid grid-cols-2 gap-2 mt-4">
            {bloomDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current vs Ideal */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Current vs Ideal Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="level" />
              <PolarRadiusAxis />
              <Radar name="Current" dataKey="current" stroke="#2563EB" fill="#2563EB" fillOpacity={0.6} />
              <Radar name="Ideal" dataKey="ideal" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
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
        </div>
      </div>

      {/* Subject-wise Analysis */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Subject-wise Bloom's Distribution</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={subjectWiseBloom}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="subject" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="remember" fill="#2563EB" radius={[4, 4, 0, 0]} />
            <Bar dataKey="understand" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            <Bar dataKey="apply" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="analyze" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="evaluate" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            <Bar dataKey="create" fill="#EF4444" radius={[4, 4, 0, 0]} />
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
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-6">
        <h2 className="font-semibold mb-4">AI Recommendations</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-warning rounded-full mt-2"></div>
            <p className="text-sm">Increase "Create" level questions by 40 to achieve better balance (target: 15%)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-warning rounded-full mt-2"></div>
            <p className="text-sm">Reduce "Remember" level questions by 30 to avoid over-representation (target: 12%)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-success rounded-full mt-2"></div>
            <p className="text-sm">"Apply" and "Analyze" levels are well-balanced and meet the ideal distribution</p>
          </div>
        </div>
      </div>
    </div>
  );
}
