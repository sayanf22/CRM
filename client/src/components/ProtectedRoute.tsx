import { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentProfile } from "@/hooks/use-profiles";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: ReactNode;
    adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const { data: profile, isLoading: profileLoading } = useCurrentProfile();
    const [location] = useLocation();

    if (loading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Redirect to="/login" />;
    }

    // Check admin-only routes
    const adminOnlyRoutes = ["/financials"];
    const isAdminRoute = adminOnly || adminOnlyRoutes.includes(location);
    
    if (isAdminRoute && profile?.role !== "admin") {
        return <Redirect to="/" />;
    }

    return <>{children}</>;
}
