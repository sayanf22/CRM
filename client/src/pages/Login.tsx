import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, LogIn, Loader2, Users, CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | null;

interface JoinRequest {
    id: string;
    email: string;
    full_name: string | null;
    status: JoinRequestStatus;
    rejection_reason: string | null;
    created_at: string;
}

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { signIn } = useAuth();
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    // Join team state
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [joinEmail, setJoinEmail] = useState("");
    const [joinName, setJoinName] = useState("");
    const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);
    const [joinRequest, setJoinRequest] = useState<JoinRequest | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);

    // Real-time subscription for join request status
    useEffect(() => {
        if (!joinRequest?.id) return;

        const channel = supabase
            .channel(`join-request-${joinRequest.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'team_join_requests',
                    filter: `id=eq.${joinRequest.id}`
                },
                (payload) => {
                    const updated = payload.new as JoinRequest;
                    setJoinRequest(updated);
                    
                    if (updated.status === 'approved') {
                        toast({
                            title: "Request Approved! 🎉",
                            description: "You can now create your account.",
                        });
                    } else if (updated.status === 'rejected') {
                        toast({
                            title: "Request Rejected",
                            description: updated.rejection_reason || "Your request was not approved.",
                            variant: "destructive",
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [joinRequest?.id, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast({
                title: "Missing fields",
                description: "Please enter both email and password.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        const { error } = await signIn(email, password);
        setIsLoading(false);

        if (error) {
            toast({
                title: "Login failed",
                description: error.message || "Invalid email or password.",
                variant: "destructive",
            });
        } else {
            toast({
                title: "Welcome back!",
                description: "You have successfully logged in.",
            });
            setLocation("/");
        }
    };

    const checkExistingRequest = async (emailToCheck: string) => {
        setCheckingStatus(true);
        const { data, error } = await supabase
            .from("team_join_requests")
            .select("*")
            .eq("email", emailToCheck.toLowerCase())
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
        
        setCheckingStatus(false);
        
        if (data && !error) {
            setJoinRequest(data);
            return data;
        }
        return null;
    };

    const handleJoinRequest = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!joinEmail) {
            toast({
                title: "Email required",
                description: "Please enter your email address.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmittingJoin(true);

        // Check if there's an existing request
        const existing = await checkExistingRequest(joinEmail);
        
        if (existing) {
            setIsSubmittingJoin(false);
            if (existing.status === 'pending') {
                toast({
                    title: "Request already pending",
                    description: "Your request is waiting for admin approval.",
                });
            } else if (existing.status === 'approved') {
                toast({
                    title: "Already approved!",
                    description: "You can create your account now.",
                });
            }
            return;
        }

        // Create new join request
        const { data, error } = await supabase
            .from("team_join_requests")
            .insert({
                email: joinEmail.toLowerCase(),
                full_name: joinName || null,
            })
            .select()
            .single();

        setIsSubmittingJoin(false);

        if (error) {
            toast({
                title: "Request failed",
                description: error.message,
                variant: "destructive",
            });
        } else {
            setJoinRequest(data);
            toast({
                title: "Request submitted!",
                description: "Waiting for admin approval. You'll be notified when approved.",
            });
        }
    };

    const handleCreateAccount = () => {
        if (joinRequest?.status === 'approved') {
            // Navigate to join page with approved email
            setLocation(`/join?email=${encodeURIComponent(joinRequest.email)}&approved=true`);
        }
    };

    const resetJoinForm = () => {
        setShowJoinForm(false);
        setJoinEmail("");
        setJoinName("");
        setJoinRequest(null);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
            <AnimatePresence mode="wait">
                {!showJoinForm ? (
                    <motion.div
                        key="login"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-md"
                    >
                        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/90">
                            <CardHeader className="space-y-1 text-center pb-6">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.4 }}
                                    className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                                >
                                    <LogIn className="w-8 h-8 text-white" />
                                </motion.div>
                                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Welcome Back
                                </CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Sign in to access your CRM dashboard
                                </CardDescription>
                            </CardHeader>

                            <form onSubmit={handleSubmit}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-medium">
                                            Email Address
                                        </Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="you@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="pl-10 h-11 border-muted focus:border-primary transition-colors"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-sm font-medium">
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="pl-10 h-11 border-muted focus:border-primary transition-colors"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="flex flex-col gap-4 pt-2">
                                    <Button
                                        type="submit"
                                        className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-300"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Signing in...
                                            </>
                                        ) : (
                                            "Sign In"
                                        )}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="link"
                                        className="text-sm text-muted-foreground hover:text-primary"
                                        onClick={() => setLocation("/forgot-password")}
                                        disabled={isLoading}
                                    >
                                        Forgot your password?
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-center mt-6 space-y-2"
                        >
                            <p className="text-sm text-muted-foreground">
                                Want to join an existing team?
                            </p>
                            <Button
                                variant="outline"
                                className="text-sm"
                                onClick={() => setShowJoinForm(true)}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Request to Join Team
                            </Button>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="join"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-md"
                    >
                        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/90">
                            <CardHeader className="space-y-1 text-center pb-6">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1, duration: 0.3 }}
                                    className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                                >
                                    <Users className="w-8 h-8 text-white" />
                                </motion.div>
                                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Join Team
                                </CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Request access to join your team's CRM
                                </CardDescription>
                            </CardHeader>

                            {!joinRequest ? (
                                <form onSubmit={handleJoinRequest}>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="joinEmail" className="text-sm font-medium">
                                                Your Email Address *
                                            </Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    id="joinEmail"
                                                    type="email"
                                                    placeholder="you@example.com"
                                                    value={joinEmail}
                                                    onChange={(e) => setJoinEmail(e.target.value)}
                                                    className="pl-10 h-11"
                                                    disabled={isSubmittingJoin}
                                                    required
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Use the email your team admin expects
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="joinName" className="text-sm font-medium">
                                                Your Name (optional)
                                            </Label>
                                            <Input
                                                id="joinName"
                                                type="text"
                                                placeholder="John Doe"
                                                value={joinName}
                                                onChange={(e) => setJoinName(e.target.value)}
                                                className="h-11"
                                                disabled={isSubmittingJoin}
                                            />
                                        </div>

                                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                                            <p className="text-xs text-blue-700 dark:text-blue-400">
                                                <strong>How it works:</strong> After you submit, an admin will review your request. 
                                                You'll see the status update in real-time on this page.
                                            </p>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="flex flex-col gap-3 pt-2">
                                        <Button
                                            type="submit"
                                            className="w-full h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                            disabled={isSubmittingJoin || checkingStatus}
                                        >
                                            {isSubmittingJoin || checkingStatus ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {checkingStatus ? "Checking..." : "Submitting..."}
                                                </>
                                            ) : (
                                                "Request to Join"
                                            )}
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="text-sm"
                                            onClick={resetJoinForm}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back to Login
                                        </Button>
                                    </CardFooter>
                                </form>
                            ) : (
                                <CardContent className="space-y-4">
                                    {/* Status Display */}
                                    <div className={`p-4 rounded-lg border ${
                                        joinRequest.status === 'pending' 
                                            ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20'
                                            : joinRequest.status === 'approved'
                                            ? 'bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/20'
                                            : 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20'
                                    }`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            {joinRequest.status === 'pending' && (
                                                <>
                                                    <Clock className="w-5 h-5 text-yellow-600 animate-pulse" />
                                                    <span className="font-medium text-yellow-800 dark:text-yellow-400">
                                                        Waiting for Approval
                                                    </span>
                                                </>
                                            )}
                                            {joinRequest.status === 'approved' && (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                    <span className="font-medium text-green-800 dark:text-green-400">
                                                        Request Approved! 🎉
                                                    </span>
                                                </>
                                            )}
                                            {joinRequest.status === 'rejected' && (
                                                <>
                                                    <XCircle className="w-5 h-5 text-red-600" />
                                                    <span className="font-medium text-red-800 dark:text-red-400">
                                                        Request Rejected
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        
                                        <p className="text-sm text-muted-foreground">
                                            Email: <strong>{joinRequest.email}</strong>
                                        </p>
                                        
                                        {joinRequest.status === 'pending' && (
                                            <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-2">
                                                This page will update automatically when an admin responds.
                                            </p>
                                        )}
                                        
                                        {joinRequest.status === 'rejected' && joinRequest.rejection_reason && (
                                            <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                                                Reason: {joinRequest.rejection_reason}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions based on status */}
                                    {joinRequest.status === 'approved' && (
                                        <Button
                                            onClick={handleCreateAccount}
                                            className="w-full h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Create Your Account
                                        </Button>
                                    )}

                                    {joinRequest.status === 'rejected' && (
                                        <Button
                                            onClick={() => setJoinRequest(null)}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            Try Again with Different Email
                                        </Button>
                                    )}

                                    <Button
                                        variant="ghost"
                                        className="w-full text-sm"
                                        onClick={resetJoinForm}
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Login
                                    </Button>
                                </CardContent>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
