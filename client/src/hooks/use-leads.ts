import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Lead {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    business_name: string | null;
    business_category: string | null;
    assigned_to: string | null;
    status: "not_interested" | "not_sure" | "interested" | "converted";
    interest_level: number;
    priority: "low" | "normal" | "high" | "urgent";
    follow_up_status: "pending" | "done" | "skipped";
    last_contact: string | null;
    next_follow_up: string | null;
    notes: string | null;
    source: string | null;
    created_at: string;
    updated_at: string;
}

export function useLeads() {
    return useQuery({
        queryKey: ["leads"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("leads")
                .select("*")
                .neq("status", "converted")  // Exclude converted leads
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as Lead[];
        },
    });
}

export function useLead(id: string | null) {
    return useQuery({
        queryKey: ["leads", id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from("leads")
                .select("*")
                .eq("id", id)
                .single();
            if (error) throw error;
            return data as Lead;
        },
        enabled: !!id,
    });
}

export function useCreateLead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => {
            const { data, error } = await supabase
                .from("leads")
                .insert(lead)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
        },
    });
}

export function useUpdateLead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
            const { data, error } = await supabase
                .from("leads")
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            queryClient.invalidateQueries({ queryKey: ["leads", data.id] });
        },
    });
}

export function useDeleteLead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("leads").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
        },
    });
}
