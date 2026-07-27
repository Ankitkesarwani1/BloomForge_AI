import { useState, useEffect, useRef } from "react";
import {
  Users,
  Shield,
  FileText,
  Activity,
  Search,
  MoreVertical,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
  last_active: string | null;
};

type Subject = {
  id: string;
  name: string;
  code: string | null;
  department: string | null;
  creator_name: string | null;
  question_count: number;
};

type AuditLog = {
  id: string;
  user_name: string | null;
  action: string | null;
  target: string | null;
  created_at: string | null;
  status: string | null;
};

type Stats = {
  totalUsers: number;
  totalQuestions: number;
  totalSubjects: number;
  totalPapers: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
}

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function capitalizeRole(role: string | null): string {
  if (!role) return "—";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Modal Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
  bgClass,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  iconClass: string;
  bgClass: string;
  loading: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin mt-3 text-muted-foreground" />
          ) : (
            <p className="text-3xl font-bold mt-2">{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgClass}`}>
          <Icon className={`w-6 h-6 ${iconClass}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-12 text-muted-foreground">
        {message}
      </td>
    </tr>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminPanelPage() {
  const { session } = useAuth();

  // ── List state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalQuestions: 0,
    totalSubjects: 0,
    totalPapers: 0,
  });

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Search state
  const [userSearch, setUserSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");

  // ── Add User modal state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("faculty");
  const [newUserDept, setNewUserDept] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSuccess, setAddUserSuccess] = useState(false);

  // ── Edit User modal state
  const [showEditUser, setShowEditUser] = useState(false);
  const [editUserId, setEditUserId] = useState("");
  const [editUserName, setEditUserName] = useState("");
  const [editUserRole, setEditUserRole] = useState<string>("faculty");
  const [editUserDept, setEditUserDept] = useState("");
  const [editingUser, setEditingUser] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);
  const [editUserSuccess, setEditUserSuccess] = useState(false);

  // ── Add Subject modal state
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectDept, setNewSubjectDept] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);
  const [addSubjectError, setAddSubjectError] = useState<string | null>(null);
  const [addSubjectSuccess, setAddSubjectSuccess] = useState(false);

  // ─── Fetch Stats ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true);
      try {
        const [
          { count: userCount },
          { count: questionCount },
          { count: subjectCount },
          { count: paperCount },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase
            .from("questions")
            .select("*", { count: "exact", head: true }),
          supabase.from("syllabi").select("*", { count: "exact", head: true }),
          supabase
            .from("question_papers")
            .select("*", { count: "exact", head: true }),
        ]);
        setStats({
          totalUsers: userCount ?? 0,
          totalQuestions: questionCount ?? 0,
          totalSubjects: subjectCount ?? 0,
          totalPapers: paperCount ?? 0,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  // ─── Fetch Users ───────────────────────────────────────────────────────────
  async function fetchUsers() {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, department, last_active")
      .order("full_name", { ascending: true });
    if (!error && data) setUsers(data as UserProfile[]);
    else console.error("Error fetching users:", error?.message);
    setLoadingUsers(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  // ─── Fetch Subjects ────────────────────────────────────────────────────────
  async function fetchSubjects() {
    setLoadingSubjects(true);
    const { data, error } = await supabase
      .from("syllabi")
      .select("id, subject, code")
      .order("subject", { ascending: true });

    if (!error && data) {
      const enriched: Subject[] = await Promise.all(
        data.map(async (s: any) => {
          const { count } = await supabase
            .from("questions")
            .select("*", { count: "exact", head: true })
            .eq("subject_id", s.id);
          return {
            id: s.id,
            name: s.subject,
            code: s.code ?? null,
            department: "Not Specified",
            creator_name: "Admin",
            question_count: count ?? 0,
          };
        })
      );
      setSubjects(enriched);
    } else {
      console.error("Error fetching syllabi:", error?.message);
    }
    setLoadingSubjects(false);
  }

  useEffect(() => {
    fetchSubjects();
  }, []);

  // ─── Fetch Audit Logs ──────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchLogs() {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from("activity_log")
        .select(
          `id, action, target, created_at, status,
           profiles!activity_log_user_id_fkey ( full_name )`
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setAuditLogs(
          data.map((log: any) => ({
            id: log.id,
            user_name: log.profiles?.full_name ?? "System",
            action: log.action ?? null,
            target: log.target ?? null,
            created_at: log.created_at ?? null,
            status: log.status ?? null,
          }))
        );
      } else {
        console.error("Error fetching audit logs:", error?.message);
      }
      setLoadingLogs(false);
    }
    fetchLogs();
  }, []);

  // ─── Add User ──────────────────────────────────────────────────────────────
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword || !newUserName) return;
    setAddingUser(true);
    setAddUserError(null);

    // Sign up via Supabase Auth (trigger will create the profile row automatically)
    const { data, error } = await supabase.auth.signUp({
      email: newUserEmail.trim(),
      password: newUserPassword,
      options: {
        data: {
          full_name: newUserName.trim(),
          role: newUserRole,
        },
      },
    });

    if (error) {
      setAddUserError(error.message);
      setAddingUser(false);
      return;
    }

    // If the profile row exists (trigger ran), patch department separately
    if (data.user && newUserDept) {
      await supabase
        .from("profiles")
        .update({ department: newUserDept.trim() })
        .eq("id", data.user.id);
    }

    setAddUserSuccess(true);
    setAddingUser(false);

    // Refresh users list & stats
    await fetchUsers();
    setStats((prev) => ({ ...prev, totalUsers: prev.totalUsers + 1 }));

    // Reset form after short delay so user sees success
    setTimeout(() => {
      setShowAddUser(false);
      setAddUserSuccess(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("faculty");
      setNewUserDept("");
    }, 1500);
  }

  function closeAddUser() {
    setShowAddUser(false);
    setAddUserError(null);
    setAddUserSuccess(false);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole("faculty");
    setNewUserDept("");
  }

  // ─── Edit User ─────────────────────────────────────────────────────────────
  function openEditUser(user: UserProfile) {
    setEditUserId(user.id);
    setEditUserName(user.full_name || "");
    setEditUserRole(user.role || "faculty");
    setEditUserDept(user.department || "");
    setShowEditUser(true);
    setEditUserSuccess(false);
    setEditUserError(null);
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editUserName) return;
    setEditingUser(true);
    setEditUserError(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editUserName.trim(),
        role: editUserRole,
        department: editUserDept.trim() || null,
      })
      .eq("id", editUserId);

    if (error) {
      setEditUserError(error.message);
      setEditingUser(false);
      return;
    }

    setEditUserSuccess(true);
    setEditingUser(false);
    await fetchUsers(); // Refresh the table

    setTimeout(() => {
      setShowEditUser(false);
    }, 1500);
  }

  function closeEditUser() {
    setShowEditUser(false);
    setEditUserError(null);
    setEditUserSuccess(false);
  }

  // ─── Add Subject ───────────────────────────────────────────────────────────
  async function handleAddSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubjectName) return;
    setAddingSubject(true);
    setAddSubjectError(null);

    const { error } = await supabase.from("syllabi").insert({
      subject: newSubjectName.trim(),
      code: newSubjectCode.trim() || null,
      status: "incomplete",
    });

    if (error) {
      setAddSubjectError(error.message);
      setAddingSubject(false);
      return;
    }

    setAddSubjectSuccess(true);
    setAddingSubject(false);

    // Refresh subjects list & stats
    await fetchSubjects();
    setStats((prev) => ({ ...prev, totalSubjects: prev.totalSubjects + 1 }));

    setTimeout(() => {
      setShowAddSubject(false);
      setAddSubjectSuccess(false);
      setNewSubjectName("");
      setNewSubjectCode("");
      setNewSubjectDept("");
    }, 1500);
  }

  function closeAddSubject() {
    setShowAddSubject(false);
    setAddSubjectError(null);
    setAddSubjectSuccess(false);
    setNewSubjectName("");
    setNewSubjectCode("");
    setNewSubjectDept("");
  }

  // ─── Delete User ───────────────────────────────────────────────────────────
  async function handleDeleteUser(userId: string) {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setStats((prev) => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
    } else {
      alert("Failed to delete user: " + error.message);
    }
  }

  // ─── Delete Subject ────────────────────────────────────────────────────────
  async function handleDeleteSubject(subjectId: string) {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    const { error } = await supabase
      .from("syllabi")
      .delete()
      .eq("id", subjectId);
    if (!error) {
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      setStats((prev) => ({ ...prev, totalSubjects: prev.totalSubjects - 1 }));
    } else {
      alert("Failed to delete subject: " + error.message);
    }
  }

  // ─── Filtered lists ────────────────────────────────────────────────────────
  const filteredUsers = users.filter(
    (u) =>
      !userSearch ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.department?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredSubjects = subjects.filter(
    (s) =>
      !subjectSearch ||
      s.name?.toLowerCase().includes(subjectSearch.toLowerCase()) ||
      s.code?.toLowerCase().includes(subjectSearch.toLowerCase()) ||
      s.department?.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">
              Manage users, subjects, and system settings
            </p>
          </div>
          <Button onClick={() => setShowAddUser(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            label="Total Users"
            value={stats.totalUsers}
            icon={Users}
            bgClass="bg-primary/10"
            iconClass="text-primary"
            loading={loadingStats}
          />
          <StatCard
            label="Questions Generated"
            value={stats.totalQuestions}
            icon={Activity}
            bgClass="bg-green-500/10"
            iconClass="text-green-500"
            loading={loadingStats}
          />
          <StatCard
            label="Total Subjects"
            value={stats.totalSubjects}
            icon={BookOpen}
            bgClass="bg-blue-500/10"
            iconClass="text-blue-500"
            loading={loadingStats}
          />
          <StatCard
            label="Question Papers"
            value={stats.totalPapers}
            icon={FileText}
            bgClass="bg-purple-500/10"
            iconClass="text-purple-500"
            loading={loadingStats}
          />
        </div>

        {/* Tabs */}
        <div className="bg-card border border-border rounded-xl p-6">
          <Tabs defaultValue="users">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
              <TabsTrigger value="settings">System Settings</TabsTrigger>
            </TabsList>

            {/* ── Users Tab ──────────────────────────────────────────────── */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email or department…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">Filter</Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-semibold text-sm">Name</th>
                      <th className="text-left p-3 font-semibold text-sm">Email</th>
                      <th className="text-left p-3 font-semibold text-sm">Role</th>
                      <th className="text-left p-3 font-semibold text-sm">Department</th>
                      <th className="text-left p-3 font-semibold text-sm">Last Active</th>
                      <th className="text-left p-3 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground mt-2 text-sm">Loading users…</p>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <EmptyRow
                        cols={6}
                        message={
                          userSearch
                            ? "No users match your search."
                            : "No users yet. Click \"Add User\" to create one."
                        }
                      />
                    ) : (
                      filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-border hover:bg-accent/50 transition-colors"
                        >
                          <td className="p-3 font-semibold">{user.full_name ?? "—"}</td>
                          <td className="p-3 text-muted-foreground">{user.email ?? "—"}</td>
                          <td className="p-3">
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                              {capitalizeRole(user.role)}
                            </Badge>
                          </td>
                          <td className="p-3">{user.department ?? <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-3 text-muted-foreground text-sm">
                            {formatRelativeTime(user.last_active)}
                          </td>
                          <td className="p-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditUser(user)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!loadingUsers && filteredUsers.length > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? "s" : ""}
                </p>
              )}
            </TabsContent>

            {/* ── Subjects Tab ───────────────────────────────────────────── */}
            <TabsContent value="subjects" className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, code or department…"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setShowAddSubject(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subject
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-semibold text-sm">Subject Name</th>
                      <th className="text-left p-3 font-semibold text-sm">Code</th>
                      <th className="text-left p-3 font-semibold text-sm">Department</th>
                      <th className="text-left p-3 font-semibold text-sm">Created By</th>
                      <th className="text-left p-3 font-semibold text-sm">Questions</th>
                      <th className="text-left p-3 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingSubjects ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground mt-2 text-sm">Loading subjects…</p>
                        </td>
                      </tr>
                    ) : filteredSubjects.length === 0 ? (
                      <EmptyRow
                        cols={6}
                        message={
                          subjectSearch
                            ? "No subjects match your search."
                            : "No subjects yet. Click \"Add Subject\" to create one."
                        }
                      />
                    ) : (
                      filteredSubjects.map((subject) => (
                        <tr
                          key={subject.id}
                          className="border-b border-border hover:bg-accent/50 transition-colors"
                        >
                          <td className="p-3 font-semibold">{subject.name}</td>
                          <td className="p-3">
                            {subject.code ? (
                              <Badge variant="outline">{subject.code}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3">{subject.department ?? <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-3 text-muted-foreground">{subject.creator_name ?? "—"}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg font-semibold text-sm">
                              {subject.question_count}
                            </span>
                          </td>
                          <td className="p-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Subject
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteSubject(subject.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Subject
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ── Audit Logs Tab ─────────────────────────────────────────── */}
            <TabsContent value="audit" className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search logs…" className="pl-10" />
                </div>
                <Button variant="outline">Export Logs</Button>
              </div>

              {loadingLogs ? (
                <div className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2 text-sm">Loading activity logs…</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No activity logs found. Logs will appear as users perform actions.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 border border-border rounded-xl hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-semibold">{log.user_name ?? "System"}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{log.action ?? "Unknown action"}</span>
                          </div>
                          {log.target && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Target: <span className="font-medium">{log.target}</span>
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimestamp(log.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          {log.status === "success" ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : log.status === "error" ? (
                            <XCircle className="w-4 h-4 text-destructive" />
                          ) : null}
                          <Badge
                            variant={
                              log.status === "success"
                                ? "default"
                                : log.status === "error"
                                ? "destructive"
                                : "secondary"
                            }
                            className={log.status === "success" ? "bg-green-500 text-white" : ""}
                          >
                            {log.status ?? "unknown"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Settings Tab ───────────────────────────────────────────── */}
            <TabsContent value="settings" className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">General Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2">System Name</label>
                    <Input defaultValue="GenQGen" />
                  </div>
                  <div>
                    <label className="block mb-2">Default Language</label>
                    <Input defaultValue="English" />
                  </div>
                  <div>
                    <label className="block mb-2">Time Zone</label>
                    <Input defaultValue="UTC+05:30" />
                  </div>
                  <div>
                    <label className="block mb-2">Session Timeout (minutes)</label>
                    <Input type="number" defaultValue="30" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="font-semibold">AI Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2">AI Model</label>
                    <Input defaultValue="Llama 3" />
                  </div>
                  <div>
                    <label className="block mb-2">Temperature</label>
                    <Input type="number" step="0.1" defaultValue="0.7" />
                  </div>
                  <div>
                    <label className="block mb-2">Max Tokens</label>
                    <Input type="number" defaultValue="2048" />
                  </div>
                  <div>
                    <label className="block mb-2">Generation Timeout (seconds)</label>
                    <Input type="number" defaultValue="60" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <Button>Save Settings</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ADD USER MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={showAddUser} onClose={closeAddUser} title="Add New User">
        {addUserSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-semibold text-lg">User Created!</p>
            <p className="text-sm text-muted-foreground">
              The user account has been created successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={handleAddUser} className="space-y-4">
            <FormField label="Full Name" required>
              <Input
                placeholder="e.g. Dr. Ankit Kesarwani"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Email Address" required>
              <Input
                type="email"
                placeholder="user@university.edu"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Password" required>
              <Input
                type="password"
                placeholder="Min. 6 characters"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                minLength={6}
                required
              />
            </FormField>

            <FormField label="Role" required>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="exam_cell">Exam Cell</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Department">
              <Input
                placeholder="e.g. Computer Science (optional)"
                value={newUserDept}
                onChange={(e) => setNewUserDept(e.target.value)}
              />
            </FormField>

            {addUserError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive">{addUserError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={closeAddUser}
                disabled={addingUser}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={addingUser}>
                {addingUser ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          EDIT USER MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={showEditUser} onClose={closeEditUser} title="Edit User">
        {editUserSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-semibold text-lg">User Updated!</p>
            <p className="text-sm text-muted-foreground">
              The user's profile has been updated successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={handleEditUser} className="space-y-4">
            <FormField label="Full Name" required>
              <Input
                placeholder="e.g. Dr. Ankit Kesarwani"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Role" required>
              <Select value={editUserRole} onValueChange={setEditUserRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="exam_cell">Exam Cell</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Department">
              <Input
                placeholder="e.g. Computer Science (optional)"
                value={editUserDept}
                onChange={(e) => setEditUserDept(e.target.value)}
              />
            </FormField>

            {editUserError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive">{editUserError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={closeEditUser}
                disabled={editingUser}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={editingUser}>
                {editingUser ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          ADD SUBJECT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={showAddSubject} onClose={closeAddSubject} title="Add New Subject">
        {addSubjectSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-semibold text-lg">Subject Added!</p>
            <p className="text-sm text-muted-foreground">
              The subject has been created successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={handleAddSubject} className="space-y-4">
            <FormField label="Subject Name" required>
              <Input
                placeholder="e.g. Data Structures & Algorithms"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Subject Code">
              <Input
                placeholder="e.g. CS301 (optional)"
                value={newSubjectCode}
                onChange={(e) => setNewSubjectCode(e.target.value)}
              />
            </FormField>

            <FormField label="Department">
              <Input
                placeholder="e.g. Computer Science (optional)"
                value={newSubjectDept}
                onChange={(e) => setNewSubjectDept(e.target.value)}
              />
            </FormField>

            {addSubjectError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive">{addSubjectError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={closeAddSubject}
                disabled={addingSubject}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={addingSubject}>
                {addingSubject ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subject
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
