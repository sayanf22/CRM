import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Task {
    id: string;
    title: string;
    description: string | null;
    assigned_to: string | null;
    assigned_by: string | null;
    related_lead_id: string | null;
    related_client_id: string | null;
    due_date: string;
    reminder_time: string | null;
    status: "pending" | "in_progress" | "completed";
    task_type: "task" | "revision" | "review" | "delivery";
    priority: "low" | "normal" | "high" | "urgent";
    completion_note: string | null;
    started_at: string | null;
    completed_at: string | null;
    revision_count: number;
    acceptance_status: "pending" | "accepted" | "declined";
    accepted_at: string | null;
    declined_at: string | null;
    decline_reason: string | null;
    // Reminder fields
    reminder_interval_hours: number;
    next_reminder_at: string | null;
    reminders_sent: number;
    max_reminders: number;
    created_at: string;
    updated_at: string;
}

// Helper function to send task notification via Edge Function
export async function sendTaskNotification(
    taskId: string,
    userId: string,
    assignedByName: string,
    notificationType: 'task_assigned' | 'task_reminder' = 'task_assigned'
) {
    try {
        // Build title and message based on notification type
        const title = notificationType === 'task_assigned' 
            ? 'New Task Assigned' 
            : 'Task Reminder';
        const message = notificationType === 'task_assigned'
            ? `New task assigned by ${assignedByName}`
            : 'Reminder: Task still pending';
        
        const { data, error } = await supabase.functions.invoke('send-task-notification', {
            body: {
                task_id: taskId,
                user_id: userId,
                title,
                message,
                notification_type: notificationType,
                data: {
                    assigned_by_name: assignedByName
                }
            }
        });
        
        if (error) {
            console.error('Failed to send task notification:', error);
            return { success: false, error };
        }
        
        return { success: true, data };
    } catch (err) {
        console.error('Error calling notification function:', err);
        return { success: false, error: err };
    }
}

export function useTasks() {
    return useQuery({
        queryKey: ["tasks"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .order("due_date", { ascending: true });
            if (error) throw error;
            return data as Task[];
        },
    });
}

export function useTask(id: string | null) {
    return useQuery({
        queryKey: ["tasks", id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .eq("id", id)
                .single();
            if (error) throw error;
            return data as Task;
        },
        enabled: !!id,
    });
}

export function useCreateTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (task: Omit<Task, "id" | "created_at" | "updated_at" | "reminder_interval_hours" | "next_reminder_at" | "reminders_sent" | "max_reminders"> & {
            reminder_interval_hours?: number;
            next_reminder_at?: string | null;
            reminders_sent?: number;
            max_reminders?: number;
        }) => {
            // Set next_reminder_at to now() for immediate first notification
            const taskWithReminder = {
                ...task,
                next_reminder_at: new Date().toISOString(),
                reminder_interval_hours: task.reminder_interval_hours ?? 5,
                reminders_sent: 0,
                max_reminders: task.max_reminders ?? 6,
            };
            
            const { data, error } = await supabase
                .from("tasks")
                .insert(taskWithReminder)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}

export function useUpdateTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
            const { data, error } = await supabase
                .from("tasks")
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["tasks", data.id] });
        },
    });
}

export function useDeleteTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("tasks").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}
