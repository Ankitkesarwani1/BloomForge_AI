import { useState } from "react";
import {
  User,
  Mail,
  Lock,
  Bell,
  Moon,
  Sun,
  Shield,
  Key,
  Save,
  Camera,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useTheme } from "../theme-provider";

export function ProfileSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    paperGenerated: true,
    approvalNeeded: true,
    weeklyReport: false,
    systemUpdates: true,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-card border border-border rounded-xl">
        <Tabs defaultValue="profile">
          <div className="border-b border-border">
            <TabsList className="w-full justify-start rounded-none border-0 bg-transparent p-0">
              <TabsTrigger
                value="profile"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="account"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Account
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Appearance
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Security
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Profile Tab */}
          <TabsContent value="profile" className="p-6 space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-12 h-12 text-primary" />
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:opacity-90">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h3 className="font-semibold">Profile Picture</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a new profile picture
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2">First Name</label>
                  <Input defaultValue="Sarah" />
                </div>
                <div>
                  <label className="block mb-2">Last Name</label>
                  <Input defaultValue="Johnson" />
                </div>
              </div>

              <div>
                <label className="block mb-2">Email</label>
                <Input type="email" defaultValue="sarah.johnson@university.edu" />
              </div>

              <div>
                <label className="block mb-2">Department</label>
                <Input defaultValue="Computer Science" />
              </div>

              <div>
                <label className="block mb-2">Designation</label>
                <Input defaultValue="Associate Professor" />
              </div>

              <div>
                <label className="block mb-2">Bio</label>
                <Textarea
                  rows={4}
                  defaultValue="Associate Professor with 10+ years of experience in Computer Science education. Specialized in Data Structures and Algorithms."
                />
              </div>

              <div>
                <label className="block mb-2">Phone Number</label>
                <Input type="tel" defaultValue="+91 98765 43210" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline">Cancel</Button>
            </div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Account Information</h3>
              <div>
                <label className="block mb-2">Username</label>
                <Input defaultValue="sarah.johnson" />
              </div>
              <div>
                <label className="block mb-2">Email Address</label>
                <div className="flex items-center gap-3">
                  <Input type="email" defaultValue="sarah.johnson@university.edu" />
                  <Button variant="outline">Verify</Button>
                </div>
              </div>
              <div>
                <label className="block mb-2">Employee ID</label>
                <Input defaultValue="EMP-2024-CS-042" disabled />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="font-semibold">Change Password</h3>
              <div>
                <label className="block mb-2">Current Password</label>
                <Input type="password" placeholder="Enter current password" />
              </div>
              <div>
                <label className="block mb-2">New Password</label>
                <Input type="password" placeholder="Enter new password" />
              </div>
              <div>
                <label className="block mb-2">Confirm New Password</label>
                <Input type="password" placeholder="Confirm new password" />
              </div>
              <Button>
                <Lock className="w-4 h-4 mr-2" />
                Update Password
              </Button>
            </div>

            <div className="pt-6 border-t border-border">
              <h3 className="font-semibold text-destructive mb-2">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button variant="destructive">Delete Account</Button>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Theme</h3>
              <p className="text-sm text-muted-foreground">
                Choose how GenQGen looks to you. Select a single theme, or sync with your
                system.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background border border-border rounded-lg">
                      <Sun className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Light</p>
                      <p className="text-xs text-muted-foreground">Day theme</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setTheme("dark")}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background border border-border rounded-lg">
                      <Moon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Dark</p>
                      <p className="text-xs text-muted-foreground">Night theme</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setTheme("system")}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    theme === "system"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background border border-border rounded-lg">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">System</p>
                      <p className="text-xs text-muted-foreground">Auto sync</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="font-semibold">Display</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Compact Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Reduce spacing between elements
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Show Animations</p>
                  <p className="text-sm text-muted-foreground">
                    Enable interface animations
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Email Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Enable Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailNotifications: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Paper Generated</p>
                    <p className="text-sm text-muted-foreground">
                      When a question paper is successfully generated
                    </p>
                  </div>
                  <Switch
                    checked={notifications.paperGenerated}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, paperGenerated: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Approval Needed</p>
                    <p className="text-sm text-muted-foreground">
                      When your approval is required
                    </p>
                  </div>
                  <Switch
                    checked={notifications.approvalNeeded}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, approvalNeeded: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Weekly Report</p>
                    <p className="text-sm text-muted-foreground">
                      Get weekly activity summary
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReport}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, weeklyReport: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">System Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Important system announcements
                    </p>
                  </div>
                  <Switch
                    checked={notifications.systemUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, systemUpdates: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Two-Factor Authentication</h3>
              <div className="flex items-start gap-4 p-4 bg-muted rounded-xl">
                <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold">Enable 2FA</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add an extra layer of security to your account
                  </p>
                  <Button className="mt-3">Enable Two-Factor Authentication</Button>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="font-semibold">Active Sessions</h3>
              <div className="space-y-3">
                <div className="flex items-start justify-between p-4 border border-border rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Windows - Chrome</p>
                      <p className="text-sm text-muted-foreground">India • 192.168.1.1</p>
                      <p className="text-xs text-muted-foreground mt-1">Active now</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-success/10 text-success rounded-lg text-xs font-semibold">
                    Current
                  </span>
                </div>
                <div className="flex items-start justify-between p-4 border border-border rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">iPhone - Safari</p>
                      <p className="text-sm text-muted-foreground">India • 192.168.1.105</p>
                      <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Revoke
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="font-semibold">API Access</h3>
              <p className="text-sm text-muted-foreground">
                Manage API keys for programmatic access
              </p>
              <Button variant="outline">
                <Key className="w-4 h-4 mr-2" />
                Generate API Key
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
