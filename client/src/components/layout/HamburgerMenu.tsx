import { useState } from "react";
import { 
  User, Settings, LogOut, Bell, HelpCircle, Moon, Sun, Monitor,
  Shield, Download, Upload, Trash2, Database, Mail, Globe,
  Smartphone, Lock, Eye, Volume2, Palette, ChevronRight, X,
  FileText, BarChart3, Clock, Calendar, Users, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  status: string | null;
  avatar_url: string | null;
}

interface AppSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  autoSave: boolean;
  compactMode: boolean;
  showOnlineStatus: boolean;
}


export default function HamburgerMenu() {
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: "", avatar_url: "" });
  
  // App Settings State
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("appSettings");
    return saved ? JSON.parse(saved) : {
      emailNotifications: true,
      pushNotifications: true,
      soundEnabled: true,
      autoSave: true,
      compactMode: false,
      showOnlineStatus: true,
    };
  });

  const saveAppSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem("appSettings", JSON.stringify(newSettings));
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  };

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user?.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: "Profile updated", description: "Your profile has been saved." });
      setActiveDialog(null);
    },
  });


  const handleOpenDialog = (dialog: string) => {
    if (dialog === "profile" && profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        avatar_url: profile.avatar_url || "",
      });
    }
    setActiveDialog(dialog);
    setIsOpen(false);
  };

  const handleSaveProfile = () => {
    updateProfile.mutate({
      full_name: profileForm.full_name || null,
      avatar_url: profileForm.avatar_url || null,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const handleExportData = () => {
    toast({ title: "Exporting data...", description: "Your data export will be ready shortly." });
    // Simulate export
    setTimeout(() => {
      toast({ title: "Export complete", description: "Your data has been exported successfully." });
    }, 2000);
  };

  const handleClearCache = () => {
    queryClient.clear();
    localStorage.removeItem("appSettings");
    toast({ title: "Cache cleared", description: "Application cache has been cleared." });
  };

  const menuItems = [
    { icon: User, label: "Profile", onClick: () => handleOpenDialog("profile"), color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { icon: Bell, label: "Notifications", onClick: () => handleOpenDialog("notifications"), color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10" },
    { icon: Settings, label: "Settings", onClick: () => handleOpenDialog("settings"), color: "text-green-500", bg: "bg-green-50 dark:bg-green-500/10" },
    { icon: Shield, label: "Privacy & Security", onClick: () => handleOpenDialog("privacy"), color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
    { icon: Database, label: "Data Management", onClick: () => handleOpenDialog("data"), color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-500/10" },
    { icon: HelpCircle, label: "Help & Support", onClick: () => handleOpenDialog("help"), color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-500/10" },
  ];

  const menuItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.08, duration: 0.3 },
    }),
  };


  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-card hover:bg-secondary border border-border transition-all duration-300 hover:shadow-md hover:scale-105 active:scale-95">
            <MenuToggleIcon open={isOpen} className="w-5 h-5 text-foreground" duration={400} strokeWidth={2} />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 p-0 border-l border-border">
          <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/20">
            <SheetHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl font-display font-bold">Menu</SheetTitle>
              </div>
              
              {profile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-card shadow-sm flex items-center justify-center overflow-hidden">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-14 h-14 object-cover" />
                        ) : (
                          <User className="w-7 h-7 text-primary" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{profile.full_name || "User"}</p>
                      <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                      <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                        {profile.role || "member"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </SheetHeader>
            
            <div className="flex-1 px-4 py-2 overflow-y-auto">
              <div className="space-y-1">
                {menuItems.map((item, index) => (
                  <motion.button
                    key={item.label}
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    variants={menuItemVariants}
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary/50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110", item.bg)}>
                        <item.icon className={cn("w-5 h-5", item.color)} />
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Button variant="ghost" className="w-full justify-start h-12 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl" onClick={handleSignOut}>
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mr-3">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Sign Out</span>
                </Button>
              </motion.div>
              <p className="text-center text-xs text-muted-foreground mt-4">Unity CRM v1.0</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>


      {/* Profile Dialog */}
      <Dialog open={activeDialog === "profile"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Profile Settings</DialogTitle>
            <DialogDescription>Manage your personal information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                {profileForm.avatar_url ? (
                  <img src={profileForm.avatar_url} alt="" className="w-20 h-20 object-cover" />
                ) : (
                  <User className="w-10 h-10 text-primary" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={profileForm.full_name} onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Your full name" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email || ""} disabled className="bg-muted h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input id="avatarUrl" value={profileForm.avatar_url} onChange={(e) => setProfileForm(prev => ({ ...prev, avatar_url: e.target.value }))} placeholder="https://example.com/avatar.jpg" className="h-11" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={profile?.role || "admin"} disabled className="bg-muted h-11 capitalize" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input value={profile?.status || "active"} disabled className="bg-muted h-11 capitalize" />
              </div>
            </div>
            <Button onClick={handleSaveProfile} className="w-full h-11" disabled={updateProfile.isPending}>
              {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Settings Dialog */}
      <Dialog open={activeDialog === "settings"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Settings className="w-5 h-5" /> App Settings
            </DialogTitle>
            <DialogDescription>Customize your CRM experience</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Theme Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4" /> Appearance
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "dark", icon: Moon, label: "Dark" },
                  { value: "system", icon: Monitor, label: "System" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      theme === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <option.icon className={cn("w-5 h-5", theme === option.value ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-medium", theme === option.value ? "text-primary" : "text-muted-foreground")}>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* General Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4" /> General
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Compact Mode</p>
                      <p className="text-xs text-muted-foreground">Reduce spacing in lists</p>
                    </div>
                  </div>
                  <Switch checked={appSettings.compactMode} onCheckedChange={(checked) => saveAppSettings({ ...appSettings, compactMode: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Auto-save</p>
                      <p className="text-xs text-muted-foreground">Save changes automatically</p>
                    </div>
                  </div>
                  <Switch checked={appSettings.autoSave} onCheckedChange={(checked) => saveAppSettings({ ...appSettings, autoSave: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Show Online Status</p>
                      <p className="text-xs text-muted-foreground">Let others see when you're online</p>
                    </div>
                  </div>
                  <Switch checked={appSettings.showOnlineStatus} onCheckedChange={(checked) => saveAppSettings({ ...appSettings, showOnlineStatus: checked })} />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Notifications Dialog */}
      <Dialog open={activeDialog === "notifications"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notification Settings
            </DialogTitle>
            <DialogDescription>Control how you receive notifications</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
              </div>
              <Switch checked={appSettings.emailNotifications} onCheckedChange={(checked) => saveAppSettings({ ...appSettings, emailNotifications: checked })} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Browser push notifications</p>
                </div>
              </div>
              <Switch checked={appSettings.pushNotifications} onCheckedChange={(checked) => saveAppSettings({ ...appSettings, pushNotifications: checked })} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">Sound Effects</p>
                  <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
                </div>
              </div>
              <Switch checked={appSettings.soundEnabled} onCheckedChange={(checked) => saveAppSettings({ ...appSettings, soundEnabled: checked })} />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Notify me about:</h4>
              <div className="grid grid-cols-2 gap-2">
                {["New leads", "Task updates", "Team mentions", "Payment received", "Deadlines", "Comments"].map((item) => (
                  <div key={item} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Privacy & Security Dialog */}
      <Dialog open={activeDialog === "privacy"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Shield className="w-5 h-5" /> Privacy & Security
            </DialogTitle>
            <DialogDescription>Manage your account security</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">Update your password</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add extra security</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">Coming Soon</span>
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Login History</p>
                  <p className="text-sm text-muted-foreground">View recent sessions</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            
            <Separator />
            
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">Danger Zone</h4>
              <p className="text-sm text-red-600 dark:text-red-400/80 mb-3">Once you delete your account, there is no going back.</p>
              <Button variant="destructive" size="sm">Delete Account</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Data Management Dialog */}
      <Dialog open={activeDialog === "data"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Database className="w-5 h-5" /> Data Management
            </DialogTitle>
            <DialogDescription>Export, import, and manage your data</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <button onClick={handleExportData} className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Export Data</p>
                  <p className="text-sm text-muted-foreground">Download all your CRM data</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Import Data</p>
                  <p className="text-sm text-muted-foreground">Import from CSV or Excel</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={handleClearCache} className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">Clear Cache</p>
                  <p className="text-sm text-muted-foreground">Clear local app data</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            
            <Separator />
            
            <div className="p-4 rounded-xl bg-muted/50">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Storage Usage
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Leads</span>
                  <span>2.4 MB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Clients</span>
                  <span>1.8 MB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks</span>
                  <span>0.9 MB</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm font-medium">
                  <span>Total</span>
                  <span>5.1 MB</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Help & Support Dialog */}
      <Dialog open={activeDialog === "help"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Help & Support
            </DialogTitle>
            <DialogDescription>Get help and learn more about Unity CRM</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Documentation</p>
                  <p className="text-sm text-muted-foreground">Learn how to use Unity CRM</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Contact Support</p>
                  <p className="text-sm text-muted-foreground">Get help from our team</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">What's New</p>
                  <p className="text-sm text-muted-foreground">See latest updates</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            
            <Separator />
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Unity CRM</h4>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Version 1.0.0</p>
                <p>© 2024 Unity CRM. All rights reserved.</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">Terms of Service</Button>
              <Button variant="outline" size="sm" className="flex-1">Privacy Policy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
