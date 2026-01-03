import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Client {
    id: string;
    lead_id: string | null;
    business_name: string;
    owner_name: string | null;
    phone: string | null;
    address: string | null;
    services: string[] | null;
    start_date: string | null;
    delivery_date: string | null;
    delivered_by: string | null;
    status: "onboarding" | "in_progress" | "waiting" | "delivered" | "closed";
    delivery_notes: string | null;
    project_value: number;
    payment_status: "pending" | "partial" | "paid";
    paid_amount: number;
    payment_date: string | null;
    created_at: string;
    updated_at: string;
}

// Helper function to notify admins about new client
export async function notifyNewClient(
    clientId: string,
    clientName: string,
    createdByName: string,
    notificationType: 'new_client' | 'client_converted' = 'new_client'
) {
    try {
        const { data, error } = await supabase.functions.invoke('notify-new-client', {
            body: {
                client_id: clientId,
                client_name: clientName,
                created_by_name: createdByName,
                notification_type: notificationType,
            }
        });
        
        if (error) {
            console.error('Failed to notify admins about new client:', error);
            return { success: false, error };
        }
        
        console.log('Admins notified about new client:', data);
        return { success: true, data };
    } catch (err) {
        console.error('Error calling notification function:', err);
        return { success: false, error: err };
    }
}

export function useClients() {
    return useQuery({
        queryKey: ["clients"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as Client[];
        },
    });
}

export function useClient(id: string | null) {
    return useQuery({
        queryKey: ["clients", id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .eq("id", id)
                .single();
            if (error) throw error;
            return data as Client;
        },
        enabled: !!id,
    });
}

export function useCreateClient() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (client: Omit<Client, "id" | "created_at" | "updated_at">) => {
            const { data, error } = await supabase
                .from("clients")
                .insert(client)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        },
    });
}

export function useUpdateClient() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
            const { data, error } = await supabase
                .from("clients")
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["clients", data.id] });
        },
    });
}


export function useDeleteClient() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("clients").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        },
    });
}
