import { Link, useLocation } from "react-router";
import {
  Brain,
  LayoutDashboard,
  BookOpen,
  Database,
  Sparkles,
  PieChart,
  Target,
  FileText,
  Key,
  BarChart3,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { path: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/app/syllabus", icon: BookOpen, label: "Syllabus Management" },
  { path: "/app/question-bank", icon: Database, label: "Question Bank" },
  { path: "/app/ai-generator", icon: Sparkles, label: "AI Generator" },
  { path: "/app/bloom-analytics", icon: PieChart, label: "Bloom's Analytics" },
  { path: "/app/coverage-analyzer", icon: Target, label: "Coverage Analyzer" },
  { path: "/app/paper-builder", icon: FileText, label: "Paper Builder" },
  { path: "/app/answer-key", icon: Key, label: "Answer Key" },
  { path: "/app/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/app/admin", icon: Users, label: "Admin Panel" },
  { path: "/app/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 z-40 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary rounded-xl">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold">GenQGen</h1>
                  <p className="text-xs text-muted-foreground">AI-Powered</p>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="p-2 bg-primary rounded-xl mx-auto">
                <Brain className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Toggle button */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl hover:bg-accent transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
