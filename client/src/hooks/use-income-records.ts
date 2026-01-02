import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface IncomeRecord {
    id: string;
    client_id: string | null;
    business_name: string;
    owner_name: string | null;
    phone: string | null;
    services: string[] | null;
    project_value: number;
    paid_amount: number;
    payment_status: "pending" | "partial" | "paid";
    payment_date: string | null;
    delivery_date: string | null;
    delivered_by: string | null;
    notes: string | null;
    lead_source: string | null;
    business_category: string | null;
    project_start_date: string | null;
    created_at: string;
    updated_at: string;
}

export function useIncomeRecords() {
    return useQuery({
        queryKey: ["income-records"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("income_records")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as IncomeRecord[];
        },
    });
}

export function useIncomeRecord(id: string | null) {
    return useQuery({
        queryKey: ["income-records", id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from("income_records")
                .select("*")
                .eq("id", id)
                .single();
            if (error) throw error;
            return data as IncomeRecord;
        },
        enabled: !!id,
    });
}

export function useCreateIncomeRecord() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (record: Omit<IncomeRecord, "id" | "created_at" | "updated_at">) => {
            const { data, error } = await supabase
                .from("income_records")
                .insert(record)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["income-records"] });
        },
    });
}

export function useUpdateIncomeRecord() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<IncomeRecord> & { id: string }) => {
            const { data, error } = await supabase
                .from("income_records")
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["income-records"] });
            queryClient.invalidateQueries({ queryKey: ["income-records", data.id] });
        },
    });
}
