import { useState, useEffect } from "react";
import { useProfiles, Profile, useCurrentProfile } from "@/hooks/use-profiles";
import { useAuth } from "@/contexts/AuthContext";
import Shell from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mail, BadgeCheck, Loader2, UserCircle, UserPlus, Copy, Check, 
  Shield, ShieldCheck, MoreVertical, AlertTriangle, Users, Clock,
  CheckCircle2, XCircle, UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface AdminPromotionRequest {
  id: string;
  user_id: string;
  requested_by: string;
  status: string;
  created_at: string;
  user?: Profile;
  requester?: Profile;
  approvals?: { admin_id: string; approved: boolean }[];
}

interface JoinRequest {
  id: string;
  email: string;
  full_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export default function Team() {
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: currentProfile } = useCurrentProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  
  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedJoinRequest, setSelectedJoinRequest] = useState<JoinRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const isAdmin = currentProfile?.role === 'admin';
  const adminCount = profiles.filter(p => p.role === 'admin').length;

  // Fetch pending join requests
  const { data: joinRequests = [], refetch: refetchJoinRequests } = useQuery({
    queryKey: ["team-join-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_join_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as JoinRequest[];
    },
    enabled: isAdmin,
  });

  // Real-time subscription for join requests
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('join-requests-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_join_requests'
        },
        (payload) => {
          console.log('Join request change:', payload);
          refetchJoinRequests();
          
          if (payload.eventType === 'INSERT') {
            const newRequest = payload.new as JoinRequest;
            toast({
              title: "New Join Request",
              description: `${newRequest.full_name || newRequest.email} wants to join the team.`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, refetchJoinRequests, toast]);

  // Approve join request
  const approveJoinRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("team_join_requests")
        .update({
          status: "approved",
          approved_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request Approved", description: "The user can now create their account." });
      queryClient.invalidateQueries({ queryKey: ["team-join-requests"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    },
  });

  // Reject join request
  const rejectJoinRequest = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const { error } = await supabase
        .from("team_join_requests")
        .update({
          status: "rejected",
          rejected_by: user?.id,
          rejection_reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request Rejected" });
      queryClient.invalidateQueries({ queryKey: ["team-join-requests"] });
      setRejectDialogOpen(false);
      setSelectedJoinRequest(null);
      setRejectionReason("");
    },
    onError: (error) => {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    },
  });


  // Fetch pending promotion requests
  const { data: promotionRequests = [] } = useQuery({
    queryKey: ["admin-promotion-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_promotion_requests")
        .select(`
          *,
          user:profiles!admin_promotion_requests_user_id_fkey(id, full_name, email, avatar_url),
          requester:profiles!admin_promotion_requests_requested_by_fkey(id, full_name)
        `)
        .eq("status", "pending");
      
      if (error) throw error;
      
      // Fetch approvals for each request
      const requestsWithApprovals = await Promise.all(
        (data || []).map(async (request) => {
          const { data: approvals } = await supabase
            .from("admin_promotion_approvals")
            .select("admin_id, approved")
            .eq("request_id", request.id);
          return { ...request, approvals: approvals || [] };
        })
      );
      
      return requestsWithApprovals as AdminPromotionRequest[];
    },
    enabled: isAdmin,
  });

  // Request admin promotion
  const requestPromotion = useMutation({
    mutationFn: async (userId: string) => {
      // Check if there's already a pending request
      const { data: existing } = await supabase
        .from("admin_promotion_requests")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .single();
      
      if (existing) {
        throw new Error("There's already a pending promotion request for this user");
      }

      const { data, error } = await supabase
        .from("admin_promotion_requests")
        .insert({
          user_id: userId,
          requested_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Promotion requested", description: "Other admins will be notified to approve." });
      queryClient.invalidateQueries({ queryKey: ["admin-promotion-requests"] });
      setPromotionDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    },
  });

  // Approve/reject promotion
  const handlePromotionVote = useMutation({
    mutationFn: async ({ requestId, approve }: { requestId: string; approve: boolean }) => {
      // Add or update approval
      const { error: approvalError } = await supabase
        .from("admin_promotion_approvals")
        .upsert({
          request_id: requestId,
          admin_id: user?.id,
          approved: approve,
        });
      
      if (approvalError) throw approvalError;

      // Check if all admins have approved
      const { data: allApprovals } = await supabase
        .from("admin_promotion_approvals")
        .select("approved")
        .eq("request_id", requestId);
      
      const approvedCount = (allApprovals || []).filter(a => a.approved).length;
      
      // If all admins approved, promote the user
      if (approvedCount >= adminCount) {
        const { data: request } = await supabase
          .from("admin_promotion_requests")
          .select("user_id")
          .eq("id", requestId)
          .single();
        
        if (request) {
          // Update user role to admin
          await supabase
            .from("profiles")
            .update({ role: "admin" })
            .eq("id", request.user_id);
          
          // Mark request as approved
          await supabase
            .from("admin_promotion_requests")
            .update({ status: "approved" })
            .eq("id", requestId);
        }
      }
      
      return { approvedCount, totalAdmins: adminCount };
    },
    onSuccess: (data) => {
      if (data.approvedCount >= data.totalAdmins) {
        toast({ title: "User promoted! 🎉", description: "The user is now an admin." });
      } else {
        toast({ title: "Vote recorded", description: `${data.approvedCount}/${data.totalAdmins} admins approved.` });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-promotion-requests"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    },
  });


  const generateInviteToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast({ title: "Email required", description: "Please enter an email address.", variant: "destructive" });
      return;
    }

    setIsInviting(true);
    const token = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase.from("team_invitations").insert({
      email: inviteEmail,
      invited_by: user?.id,
      role: inviteRole === "admin" ? "member" : inviteRole, // Always invite as member, promote later
      token: token,
      expires_at: expiresAt.toISOString(),
    });

    setIsInviting(false);

    if (error) {
      toast({ title: "Invite failed", description: error.message, variant: "destructive" });
    } else {
      const link = `${window.location.origin}/join?token=${token}`;
      setInviteLink(link);
      toast({ title: "Invitation created!", description: "Share the link with your team member." });
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteRole("member");
    setInviteLink("");
    setCopied(false);
  };

  const openPromotionDialog = (member: Profile) => {
    setSelectedMember(member);
    setPromotionDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  const pendingRequestForUser = (userId: string) => {
    return promotionRequests.find(r => r.user_id === userId);
  };

  const hasUserApproved = (request: AdminPromotionRequest) => {
    return request.approvals?.some(a => a.admin_id === user?.id && a.approved);
  };


  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Team</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {profiles.length} members • {adminCount} admin{adminCount !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isInviteOpen} onOpenChange={(open) => { setIsInviteOpen(open); if (!open) resetInviteForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>Send an invitation link to add a new team member.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {!inviteLink ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail">Email Address</Label>
                      <Input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@example.com" />
                    </div>
                    <Alert variant="info" className="bg-blue-50 dark:bg-blue-500/10">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription className="text-xs">
                        New members join as regular members. To make someone an admin, use the "Promote to Admin" option after they join. All admins must approve.
                      </AlertDescription>
                    </Alert>
                    <Button onClick={handleInvite} className="w-full" disabled={isInviting}>
                      {isInviting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Generate Invite Link
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-400 font-medium mb-2">Invitation created!</p>
                      <p className="text-xs text-green-600 dark:text-green-500">Share this link with {inviteEmail}. It expires in 7 days.</p>
                    </div>
                    <div className="flex space-x-2">
                      <Input value={inviteLink} readOnly className="text-xs" />
                      <Button variant="outline" size="icon" onClick={copyLink}>
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full" onClick={resetInviteForm}>Invite Another</Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pending Join Requests - Admin Only */}
      {isAdmin && joinRequests.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-500" />
            Pending Join Requests
            <Badge variant="secondary" className="ml-1">{joinRequests.length}</Badge>
          </h2>
          {joinRequests.map((request) => (
            <Card key={request.id} className="border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{request.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{request.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => approveJoinRequest.mutate(request.id)} 
                        disabled={approveJoinRequest.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedJoinRequest(request);
                          setRejectDialogOpen(true);
                        }}
                        disabled={rejectJoinRequest.isPending}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Promotion Requests - Admin Only */}
      {isAdmin && promotionRequests.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-500" />
            Pending Admin Promotions
          </h2>
          {promotionRequests.map((request) => {
            const approvedCount = request.approvals?.filter(a => a.approved).length || 0;
            const progress = (approvedCount / adminCount) * 100;
            const userApproved = hasUserApproved(request);
            
            return (
              <Card key={request.id} className="border-orange-200 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.user?.avatar_url || ""} />
                        <AvatarFallback>{request.user?.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.user?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Requested by {request.requester?.full_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">{approvedCount}/{adminCount} approved</p>
                        <Progress value={progress} className="w-24 h-2" />
                      </div>
                      {!userApproved ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handlePromotionVote.mutate({ requestId: request.id, approve: true })} disabled={handlePromotionVote.isPending}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handlePromotionVote.mutate({ requestId: request.id, approve: false })} disabled={handlePromotionVote.isPending}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
                          <Check className="w-3 h-3 mr-1" /> Approved
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}


      {/* Team Members Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const pendingRequest = pendingRequestForUser(profile.id);
          const isCurrentUser = profile.id === user?.id;
          
          return (
            <Card key={profile.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
              <div className={cn(
                "h-2",
                profile.role === 'admin' 
                  ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                  : "bg-gradient-to-r from-blue-500 to-indigo-600"
              )} />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center">
                  <Avatar className="h-12 w-12 mr-4">
                    <AvatarImage src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.full_name}`} />
                    <AvatarFallback>
                      {profile.full_name?.substring(0, 2).toUpperCase() || <UserCircle className="h-6 w-6" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {profile.full_name || "Unnamed User"}
                      {isCurrentUser && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                    </CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground">
                      {profile.role === 'admin' ? (
                        <ShieldCheck className="w-3 h-3 mr-1 text-amber-500" />
                      ) : (
                        <BadgeCheck className="w-3 h-3 mr-1 text-primary" />
                      )}
                      <span className="capitalize">{profile.role || "Member"}</span>
                    </div>
                  </div>
                </div>
                
                {/* Admin Actions Menu */}
                {isAdmin && !isCurrentUser && profile.role !== 'admin' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!pendingRequest ? (
                        <DropdownMenuItem onClick={() => openPromotionDialog(profile)}>
                          <Shield className="w-4 h-4 mr-2" />
                          Promote to Admin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem disabled>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Promotion Pending...
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        Remove from Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent>
                <div className="mt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate flex-1">{profile.email}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-2",
                        profile.status === "active" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30" : "bg-gray-50 text-gray-500"
                      )}
                    >
                      {profile.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {pendingRequest && (
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
                      <p className="text-xs text-orange-700 dark:text-orange-400 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Admin promotion pending approval
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t text-xs text-muted-foreground">
                    Joined: {new Date(profile.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {profiles.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No team members yet. Invite someone to get started.</p>
          </div>
        )}
      </div>

      {/* Promotion Confirmation Dialog */}
      <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Promote to Admin
            </DialogTitle>
            <DialogDescription>
              Request admin privileges for {selectedMember?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="warning" className="bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-400">
                <strong>All {adminCount} admin{adminCount !== 1 ? 's' : ''} must approve</strong> this request before {selectedMember?.full_name} becomes an admin.
              </AlertDescription>
            </Alert>
            
            <div className="p-4 rounded-lg bg-secondary/50">
              <h4 className="font-medium mb-2">Admin privileges include:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Access to financial data and reports</li>
                <li>• Ability to manage team members</li>
                <li>• Full control over leads and clients</li>
                <li>• Approve other admin promotions</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPromotionDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => selectedMember && requestPromotion.mutate(selectedMember.id)} 
                disabled={requestPromotion.isPending}
                className="flex-1"
              >
                {requestPromotion.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Request Promotion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => {
        setRejectDialogOpen(open);
        if (!open) {
          setSelectedJoinRequest(null);
          setRejectionReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Reject Join Request
            </DialogTitle>
            <DialogDescription>
              Reject the request from {selectedJoinRequest?.full_name || selectedJoinRequest?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Reason (optional)</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This will be shown to the user when they check their request status.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => selectedJoinRequest && rejectJoinRequest.mutate({ 
                  requestId: selectedJoinRequest.id, 
                  reason: rejectionReason 
                })} 
                disabled={rejectJoinRequest.isPending}
                className="flex-1"
              >
                {rejectJoinRequest.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
