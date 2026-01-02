import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    role: string | null;
    status: "active" | "inactive";
    avatar_url: string | null;
    created_at: string;
}

export function useProfiles() {
    return useQuery({
        queryKey: ["profiles"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .order("full_name", { ascending: true });
            if (error) throw error;
            return data as Profile[];
        },
    });
}

export function useProfile(id: string | null) {
    return useQuery({
        queryKey: ["profiles", id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", id)
                .single();
            if (error) throw error;
            return data as Profile;
        },
        enabled: !!id,
    });
}

export function useCurrentProfile() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ["profiles", "current", user?.id],
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
}
