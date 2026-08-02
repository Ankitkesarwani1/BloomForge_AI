import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Moon,
  Sun,
  Shield,
  Key,
  Save,
  Camera,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useTheme } from "../theme-provider";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";

export function ProfileSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    designation: "",
    bio: "",
    phone: "",
  });

  // Account Form State
  const [accountData, setAccountData] = useState({
    username: "",
    email: "",
    employeeId: "",
  });

  // Password Update State
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    paperGenerated: true,
    approvalNeeded: true,
    weeklyReport: false,
    systemUpdates: true,
  });

  // Load existing profile details into input states
  useEffect(() => {
    if (profile) {
      const names = (profile.full_name || "").split(" ");
      const firstName = names[0] || "";
      const lastName = names.slice(1).join(" ") || "";

      setFormData({
        firstName,
        lastName,
        email: profile.email || "",
        department: profile.department || "",
        designation: (profile as any).designation || "",
        bio: (profile as any).bio || "",
        phone: (profile as any).phone || "",
      });

      setAccountData({
        username: (profile as any).username || "",
        email: profile.email || "",
        employeeId: (profile as any).employee_id || "",
      });
    }
  }, [profile]);

  // Handle Save Profile Details
  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setLoading(true);

    const full_name = `${formData.firstName} ${formData.lastName}`.trim();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name,
        department: formData.department,
        designation: formData.designation,
        bio: formData.bio,
        phone: formData.phone,
        last_active: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update profile: " + error.message);
    } else {
      toast.success("Profile updated successfully");
    }
  };

  // Handle Save Account Details
  const handleSaveAccount = async () => {
    if (!profile?.id) return;
    setLoading(true);

    // 1. Update Username and Employee ID in database table
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        username: accountData.username,
        employee_id: accountData.employeeId,
      })
      .eq("id", profile.id);

    if (dbError) {
      setLoading(false);
      toast.error("Failed to update account information: " + dbError.message);
      return;
    }

    // 2. Update Auth Email if changed
    if (accountData.email !== profile.email) {
      const { error: authError } = await supabase.auth.updateUser({
        email: accountData.email,
      });

      if (authError) {
        toast.error("Account updated, but failed to update email: " + authError.message);
      } else {
        toast.success("Account updated. Verification email sent for new email.");
      }
    } else {
      toast.success("Account information updated successfully");
    }

    setLoading(false);
  };

  // Handle Update Password
  const handleUpdatePassword = async () => {
    if (!passwordData.newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setPasswordLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });

    setPasswordLoading(false);

    if (error) {
      toast.error("Failed to update password: " + error.message);
    } else {
      toast.success("Password updated successfully");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    }
  };

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
                  <label className="block text-sm font-medium mb-2">First Name</label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name</label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input type="email" value={formData.email} disabled className="bg-muted" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Department</label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Computer Science"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Designation</label>
                <Input
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="Associate Professor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <Textarea
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Share details about your academic focus or teaching experience..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button onClick={handleSaveProfile} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Account Information</h3>

              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <Input
                  value={accountData.username}
                  onChange={(e) => setAccountData({ ...accountData, username: e.target.value })}
                  placeholder="e.g. taran_25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <Input
                  type="email"
                  value={accountData.email}
                  onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                  placeholder="your.email@university.edu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Employee ID</label>
                <Input
                  value={accountData.employeeId}
                  onChange={(e) => setAccountData({ ...accountData, employeeId: e.target.value })}
                  placeholder="EMP-2026-CS-01"
                />
              </div>

              <Button onClick={handleSaveAccount} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Account Info
              </Button>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="font-semibold text-lg">Change Password</h3>

              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>

              <Button onClick={handleUpdatePassword} disabled={passwordLoading}>
                {passwordLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Update Password
              </Button>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Theme</h3>
              <p className="text-sm text-muted-foreground">
                Choose how the interface looks to you. Select a theme or sync with system settings.
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
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Email Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Enable Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
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
                    <p className="text-sm text-muted-foreground">When a question paper is successfully generated</p>
                  </div>
                  <Switch
                    checked={notifications.paperGenerated}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, paperGenerated: checked })
                    }
                  />
                </div>
              </div>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}