import { useState } from "react";
import {
  Users,
  Shield,
  Settings,
  Activity,
  Search,
  MoreVertical,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
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

const users = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@university.edu",
    role: "Faculty",
    department: "Computer Science",
    status: "active",
    lastActive: "2 hours ago",
  },
  {
    id: 2,
    name: "Prof. Michael Chen",
    email: "michael.chen@university.edu",
    role: "Faculty",
    department: "Information Technology",
    status: "active",
    lastActive: "1 day ago",
  },
  {
    id: 3,
    name: "Dr. Emily Davis",
    email: "emily.davis@university.edu",
    role: "Admin",
    department: "Examination Cell",
    status: "active",
    lastActive: "30 minutes ago",
  },
  {
    id: 4,
    name: "Prof. Robert Wilson",
    email: "robert.wilson@university.edu",
    role: "Faculty",
    department: "Electronics",
    status: "inactive",
    lastActive: "1 week ago",
  },
];

const subjects = [
  {
    id: 1,
    name: "Data Structures",
    code: "CS301",
    department: "Computer Science",
    faculty: "Dr. Sarah Johnson",
    questions: 145,
  },
  {
    id: 2,
    name: "Database Management",
    code: "CS402",
    department: "Computer Science",
    faculty: "Prof. Michael Chen",
    questions: 128,
  },
  {
    id: 3,
    name: "Operating Systems",
    code: "CS303",
    department: "Computer Science",
    faculty: "Dr. Sarah Johnson",
    questions: 112,
  },
  {
    id: 4,
    name: "Computer Networks",
    code: "CS404",
    department: "Information Technology",
    faculty: "Prof. Robert Wilson",
    questions: 98,
  },
];

const auditLogs = [
  {
    id: 1,
    user: "Dr. Sarah Johnson",
    action: "Generated question paper",
    target: "Data Structures - Mid-Term",
    timestamp: "2024-06-22 10:30:00",
    status: "success",
  },
  {
    id: 2,
    user: "Prof. Michael Chen",
    action: "Uploaded syllabus",
    target: "Database Management",
    timestamp: "2024-06-22 09:15:00",
    status: "success",
  },
  {
    id: 3,
    user: "Dr. Emily Davis",
    action: "Modified user role",
    target: "Prof. Robert Wilson",
    timestamp: "2024-06-22 08:45:00",
    status: "success",
  },
  {
    id: 4,
    user: "System",
    action: "AI generation failed",
    target: "Question batch #1234",
    timestamp: "2024-06-21 23:30:00",
    status: "error",
  },
];

export function AdminPanelPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, subjects, and system settings
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-3xl font-bold mt-2">42</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Sessions</p>
              <p className="text-3xl font-bold mt-2">28</p>
            </div>
            <div className="p-3 rounded-xl bg-success/10">
              <Activity className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Subjects</p>
              <p className="text-3xl font-bold mt-2">64</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/10">
              <Settings className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">System Health</p>
              <p className="text-3xl font-bold mt-2">98%</p>
            </div>
            <div className="p-3 rounded-xl bg-accent/10">
              <Shield className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-card border border-border rounded-xl p-6">
        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="settings">System Settings</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">Filter</Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Department</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Last Active</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-accent/50">
                      <td className="p-3 font-semibold">{user.name}</td>
                      <td className="p-3 text-muted-foreground">{user.email}</td>
                      <td className="p-3">
                        <Badge variant={user.role === "Admin" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="p-3">{user.department}</td>
                      <td className="p-3">
                        {user.status === "active" ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="text-success">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Inactive</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{user.lastActive}</td>
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
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="w-4 h-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search subjects..." className="pl-10" />
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Subject Name</th>
                    <th className="text-left p-3">Code</th>
                    <th className="text-left p-3">Department</th>
                    <th className="text-left p-3">Faculty</th>
                    <th className="text-left p-3">Questions</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="border-b border-border hover:bg-accent/50">
                      <td className="p-3 font-semibold">{subject.name}</td>
                      <td className="p-3">
                        <Badge variant="outline">{subject.code}</Badge>
                      </td>
                      <td className="p-3">{subject.department}</td>
                      <td className="p-3 text-muted-foreground">{subject.faculty}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg font-semibold">
                          {subject.questions}
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
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Subject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search logs..." className="pl-10" />
              </div>
              <Button variant="outline">Export Logs</Button>
            </div>

            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 border border-border rounded-xl hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{log.user}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{log.action}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Target: {log.target}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{log.timestamp}</p>
                    </div>
                    <Badge
                      variant={log.status === "success" ? "default" : "destructive"}
                      className={
                        log.status === "success" ? "bg-success text-white" : ""
                      }
                    >
                      {log.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Settings Tab */}
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
  );
}
