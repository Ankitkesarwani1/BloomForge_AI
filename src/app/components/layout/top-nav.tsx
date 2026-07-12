import { Bell, Search, Moon, Sun, LogOut, User } from "lucide-react";
import { useTheme } from "../theme-provider";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../lib/auth-context";

const ROLE_LABELS: Record<string, string> = {
  faculty: "Faculty",
  admin: "Admin",
  exam_cell: "Exam Cell",
};

export function TopNav() {
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const notifications = [
    { id: 1, title: "Question paper generated", time: "2 minutes ago", type: "success" },
    { id: 2, title: "Syllabus uploaded successfully", time: "1 hour ago", type: "info" },
    { id: 3, title: "Low coverage in Unit 3", time: "3 hours ago", type: "warning" },
  ];

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border backdrop-blur-sm bg-card/95">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions, syllabi, papers..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-6">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 hover:bg-accent rounded-xl transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-accent rounded-xl transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 border-b border-border hover:bg-accent transition-colors cursor-pointer"
                      >
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-2">
                    <button className="w-full py-2 text-sm text-primary hover:bg-accent rounded-lg transition-colors">
                      View all notifications
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-2 hover:bg-accent rounded-xl transition-colors"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium">{profile?.full_name || "Loading…"}</p>
                <p className="text-xs text-muted-foreground">
                  {profile ? ROLE_LABELS[profile.role] ?? profile.role : ""}
                </p>
              </div>
            </button>

            {showProfile && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfile(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <p className="font-medium">{profile?.full_name || "Loading…"}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-lg transition-colors">
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
