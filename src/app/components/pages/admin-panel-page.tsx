import { useState, useEffect, useRef } from "react";
import type React from "react";
import {
  Users,
  FileText,
  Activity,
  Search,
  MoreVertical,
  Plus,
  Edit,
  Eye,
  Trash2,
  CheckCircle,
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
  assigned_subject: string | null;
  designation?: string | null;
  bio?: string | null;
  phone?: string | null;
  username?: string | null;
  employee_id?: string | null;
  avatar_url?: string | null;
  last_active: string | null;
  questionCount?: number;
  paperCount?: number;
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
  const { profile } = useAuth();

  // ── List state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalQuestions: 0,
    totalSubjects: 0,
    totalPapers: 0,
  });

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [contentCounts, setContentCounts] = useState<Record<string, { questionCount: number; paperCount: number }>>({});

  // ── Search state
  const [userSearch, setUserSearch] = useState("");

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
  const [editUserSubject, setEditUserSubject] = useState("");
  const [editingUser, setEditingUser] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);
  const [editUserSuccess, setEditUserSuccess] = useState(false);

  // ── View User modal state
  const [showViewUser, setShowViewUser] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);

  function openViewUser(user: UserProfile) {
    setViewingUser(user);
    setShowViewUser(true);
  }

  // ─── Fetch Stats ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true);
      try {
        // `questions` and `question_papers` have RLS policies scoped to
        // created_by = auth.uid(), so a direct client-side count only ever
        // returns the admin's own rows (0). The edge function bypasses
        // this safely with the service role key, gated to admins only, and
        // also returns the per-faculty breakdown in the same round trip.
        const [{ count: userCount }, { count: subjectCount }, statsResp] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("subjects").select("*", { count: "exact", head: true }),
          supabase.functions.invoke("admin-dashboard-stats"),
        ]);

        const statsErrMessage = statsResp.error?.message || (statsResp.data as any)?.error;
        if (statsErrMessage) {
          console.error("Error fetching content stats:", statsErrMessage);
          setStats({
            totalUsers: userCount ?? 0,
            totalQuestions: 0,
            totalSubjects: subjectCount ?? 0,
            totalPapers: 0,
          });
        } else {
          const { totalQuestions, totalPapers, perUser } = statsResp.data as {
            totalQuestions: number;
            totalPapers: number;
            perUser: { id: string; questionCount: number; paperCount: number }[];
          };
          setStats({
            totalUsers: userCount ?? 0,
            totalQuestions: totalQuestions ?? 0,
            totalSubjects: subjectCount ?? 0,
            totalPapers: totalPapers ?? 0,
          });
          setContentCounts(
            Object.fromEntries(
              perUser.map((u) => [u.id, { questionCount: u.questionCount, paperCount: u.paperCount }])
            )
          );
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  // ─── Fetch Users with Fallback Strategy ────────────────────────────────────
  async function fetchUsers() {
    setLoadingUsers(true);
    let { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      console.warn("Primary fetchUsers select(*) failed, trying column fallback:", error.message);
      const fallback1 = await supabase
        .from("profiles")
        .select("id, full_name, email, role, department, assigned_subject, last_active")
        .order("full_name", { ascending: true });

      if (fallback1.error) {
        console.warn("Fallback 1 failed, trying core fields fallback:", fallback1.error.message);
        const fallback2 = await supabase
          .from("profiles")
          .select("id, full_name, email, role, department, last_active")
          .order("full_name", { ascending: true });
        data = (fallback2.data as any) ?? [];
      } else {
        data = (fallback1.data as any) ?? [];
      }
    }

    if (data) {
      setUsers(data as UserProfile[]);
    }
    setLoadingUsers(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  // ─── Add User ──────────────────────────────────────────────────────────────
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword || !newUserName) return;

    setAddingUser(true);
    setAddUserError(null);

    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        full_name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        department: newUserDept.trim() || null,
      },
    });

    // supabase-js only rejects on network-level failures; application errors
    // (validation, permission, duplicate email) come back as { error } in
    // the function's response body with a non-2xx status, so check both.
    const errMessage = error?.message || (data as any)?.error;
    if (errMessage) {
      setAddUserError(errMessage);
      setAddingUser(false);
      return;
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
    setEditUserSubject(user.assigned_subject || "");
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
        assigned_subject: editUserSubject.trim() || null,
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

  // ─── Filtered lists ────────────────────────────────────────────────────────
  const usersWithCounts = users.map((u) => ({
    ...u,
    questionCount: contentCounts[u.id]?.questionCount ?? 0,
    paperCount: contentCounts[u.id]?.paperCount ?? 0,
  }));

  const filteredUsers = usersWithCounts.filter(
    (u) =>
      !userSearch ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.department?.toLowerCase().includes(userSearch.toLowerCase())
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
              Manage users and system settings
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users">User Management</TabsTrigger>
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
                      <th className="text-left p-3 font-semibold text-sm">Assigned Subject</th>
                      <th className="text-left p-3 font-semibold text-sm">Questions</th>
                      <th className="text-left p-3 font-semibold text-sm">Papers</th>
                      <th className="text-left p-3 font-semibold text-sm">Last Active</th>
                      <th className="text-left p-3 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground mt-2 text-sm">Loading users…</p>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <EmptyRow
                        cols={9}
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
                          className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => openViewUser(user)}
                        >
                          <td className="p-3 font-semibold">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden text-xs font-bold text-primary border border-primary/20 flex-shrink-0">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  user.full_name?.charAt(0).toUpperCase() || "U"
                                )}
                              </div>
                              <span>{user.full_name ?? "—"}</span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{user.email ?? "—"}</td>
                          <td className="p-3">
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                              {capitalizeRole(user.role)}
                            </Badge>
                          </td>
                          <td className="p-3">{user.department ?? <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-3">
                            {user.assigned_subject ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                {user.assigned_subject}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Unassigned</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-green-500/10 text-green-600 rounded-lg font-semibold text-sm">
                              {user.questionCount ?? 0}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-purple-500/10 text-purple-600 rounded-lg font-semibold text-sm">
                              {user.paperCount ?? 0}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground text-sm">
                            {formatRelativeTime(user.last_active)}
                          </td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openViewUser(user)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
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

            <FormField label="Assigned Subject">
              <Input
                placeholder="e.g. Artificial Intelligence / Data Structures"
                value={editUserSubject}
                onChange={(e) => setEditUserSubject(e.target.value)}
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
          VIEW USER DETAILS MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={showViewUser} onClose={() => setShowViewUser(false)} title="User Profile Details">
        {viewingUser && (
          <div className="space-y-6 py-2">
            <div className="flex items-center gap-4 border-b border-border pb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20 text-primary font-bold text-xl flex-shrink-0">
                {viewingUser.avatar_url ? (
                  <img src={viewingUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  viewingUser.full_name?.charAt(0).toUpperCase() || "U"
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg">{viewingUser.full_name || "Unnamed User"}</h3>
                <p className="text-sm text-muted-foreground">{viewingUser.email || "No email"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={viewingUser.role === "admin" ? "default" : "secondary"}>
                    {capitalizeRole(viewingUser.role)}
                  </Badge>
                  {viewingUser.department && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
                      {viewingUser.department}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-accent/40 p-3 rounded-xl">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Assigned Subject</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {viewingUser.assigned_subject || "Not assigned"}
                </p>
              </div>

              <div className="bg-accent/40 p-3 rounded-xl">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Designation</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {viewingUser.designation || "Not specified"}
                </p>
              </div>

              <div className="bg-accent/40 p-3 rounded-xl">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Employee ID</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {viewingUser.employee_id || "N/A"}
                </p>
              </div>

              <div className="bg-accent/40 p-3 rounded-xl">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Phone Number</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {viewingUser.phone || "Not provided"}
                </p>
              </div>
            </div>

            {viewingUser.bio && (
              <div className="bg-accent/40 p-3 rounded-xl text-sm">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Bio / Notes</p>
                <p className="text-foreground leading-relaxed">{viewingUser.bio}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowViewUser(false)}>
                Close
              </Button>
              <Button onClick={() => { setShowViewUser(false); openEditUser(viewingUser); }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}