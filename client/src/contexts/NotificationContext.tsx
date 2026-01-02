import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Task } from "@/hooks/use-tasks";
import { TaskNotification } from "@/components/ui/task-notification";
import { AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface PendingTask extends Task {
  assigner_name?: string;
}

interface NotificationContextType {
  pendingTasks: PendingTask[];
  dismissTask: (taskId: string) => void;
  refreshPendingTasks: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [dismissedTasks, setDismissedTasks] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("dismissedTaskNotifications");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const fetchPendingTasks = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assigner:profiles!tasks_assigned_by_fkey(full_name)
      `)
      .eq("assigned_to", user.id)
      .eq("acceptance_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending tasks:", error);
      return;
    }

    const tasksWithAssigner = (data || []).map(task => ({
      ...task,
      assigner_name: task.assigner?.full_name || "Someone"
    }));

    // Filter out dismissed tasks
    const filteredTasks = tasksWithAssigner.filter(
      task => !dismissedTasks.has(task.id)
    );

    setPendingTasks(filteredTasks);
  };

  useEffect(() => {
    fetchPendingTasks();

    // Subscribe to new task assignments
    const channel = supabase
      .channel("task-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tasks",
          filter: `assigned_to=eq.${user?.id}`,
        },
        (payload) => {
          fetchPendingTasks();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `assigned_to=eq.${user?.id}`,
        },
        (payload) => {
          fetchPendingTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, dismissedTasks]);

  const dismissTask = (taskId: string) => {
    const newDismissed = new Set(dismissedTasks);
    newDismissed.add(taskId);
    setDismissedTasks(newDismissed);
    localStorage.setItem("dismissedTaskNotifications", JSON.stringify([...newDismissed]));
    setPendingTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleAcceptTask = async (taskId: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({
        acceptance_status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) {
      toast({ title: "Error", description: "Failed to accept task", variant: "destructive" });
      return;
    }

    toast({ title: "Task Accepted! 🎉", description: "Timer has started. Good luck!" });
    dismissTask(taskId);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const handleDeclineTask = async (taskId: string, reason: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({
        acceptance_status: "declined",
        declined_at: new Date().toISOString(),
        decline_reason: reason || null,
      })
      .eq("id", taskId);

    if (error) {
      toast({ title: "Error", description: "Failed to decline task", variant: "destructive" });
      return;
    }

    toast({ title: "Task Declined", description: "The assigner will be notified." });
    dismissTask(taskId);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const refreshPendingTasks = () => {
    fetchPendingTasks();
  };

  return (
    <NotificationContext.Provider value={{ pendingTasks, dismissTask, refreshPendingTasks }}>
      {children}
      
      {/* Floating Notifications */}
      <div className="fixed top-4 right-4 z-[100] space-y-3">
        <AnimatePresence>
          {pendingTasks.slice(0, 3).map((task) => (
            <TaskNotification
              key={task.id}
              task={task}
              assignerName={task.assigner_name || "Someone"}
              onAccept={handleAcceptTask}
              onDecline={handleDeclineTask}
              onDismiss={() => dismissTask(task.id)}
            />
          ))}
        </AnimatePresence>
      </div>
      
      {/* Show count if more than 3 */}
      {pendingTasks.length > 3 && (
        <div className="fixed top-4 right-4 mt-[calc(3*140px+3*12px)] z-[100]">
          <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
            +{pendingTasks.length - 3} more tasks pending
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
