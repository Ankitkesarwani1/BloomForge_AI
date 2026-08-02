import { useEffect, useState } from "react";
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
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// NOTE: these are assumed to match the exact strings stored in
// `profiles.role`. If your actual values differ (e.g. "teacher" /
// "administrator"), this is the only place you need to change them.
const FACULTY_ROLE = "faculty";
const ADMIN_ROLE = "admin";

interface NavItem {
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
  // Which role(s) can see this tab. Settings is shared by both roles.
  roles: Array<typeof FACULTY_ROLE | typeof ADMIN_ROLE>;
}

const navItems: NavItem[] = [
  { path: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: [FACULTY_ROLE] },
  { path: "/app/syllabus", icon: BookOpen, label: "Syllabus Management", roles: [FACULTY_ROLE] },
  { path: "/app/question-bank", icon: Database, label: "Question Bank", roles: [FACULTY_ROLE] },
  { path: "/app/ai-generator", icon: Sparkles, label: "AI Generator", roles: [FACULTY_ROLE] },
  { path: "/app/bloom-analytics", icon: PieChart, label: "Bloom's Analytics", roles: [FACULTY_ROLE] },
  { path: "/app/coverage-analyzer", icon: Target, label: "Coverage Analyzer", roles: [FACULTY_ROLE] },
  { path: "/app/paper-builder", icon: FileText, label: "Paper Builder", roles: [FACULTY_ROLE] },
  { path: "/app/answer-key", icon: Key, label: "Answer Key", roles: [FACULTY_ROLE] },
  { path: "/app/admin", icon: Users, label: "Admin Panel", roles: [ADMIN_ROLE] },
  { path: "/app/analytics", icon: BarChart3, label: "Analytics", roles: [ADMIN_ROLE] },
  { path: "/app/settings", icon: Settings, label: "Settings", roles: [FACULTY_ROLE, ADMIN_ROLE] },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { session } = useAuth();

  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      const userId = session?.user?.id;
      if (!userId) {
        setRole(null);
        setRoleLoading(false);
        return;
      }
      setRoleLoading(true);
      const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
      if (cancelled) return;
      if (error) {
        console.error("Error loading profile role for sidebar:", error);
        setRole(null);
      } else {
        setRole(data?.role ?? null);
      }
      setRoleLoading(false);
    }

    loadRole();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Falls back to showing nothing (rather than guessing) if the role hasn't
  // loaded yet or isn't recognized, so a faculty user never sees a flash of
  // admin-only links or vice versa.
  const visibleNavItems = navItems.filter((item) => (role ? item.roles.includes(role as any) : false));

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
          {roleLoading ? (
            // Lightweight skeleton while the role loads, instead of a flash
            // of the wrong tab set or an empty sidebar.
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 bg-muted rounded-xl" />
              ))}
            </div>
          ) : (
            visibleNavItems.map((item) => {
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
            })
          )}
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