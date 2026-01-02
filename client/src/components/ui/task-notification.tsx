import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, CheckSquare, Clock, User, Calendar, Flag } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Task } from "@/hooks/use-tasks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TaskNotificationProps {
  task: Task;
  assignerName: string;
  onAccept: (taskId: string) => void;
  onDecline: (taskId: string, reason: string) => void;
  onDismiss: () => void;
}

export function TaskNotification({ 
  task, 
  assignerName, 
  onAccept, 
  onDecline, 
  onDismiss 
}: TaskNotificationProps) {
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    await onAccept(task.id);
    setIsAccepting(false);
  };

  const handleDecline = () => {
    onDecline(task.id, declineReason);
    setShowDeclineDialog(false);
    setDeclineReason("");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-500 bg-red-50 dark:bg-red-500/10";
      case "high": return "text-orange-500 bg-orange-50 dark:bg-orange-500/10";
      default: return "text-blue-500 bg-blue-50 dark:bg-blue-500/10";
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Alert
          className="min-w-[380px] max-w-[420px] border-primary/20"
          layout="complex"
          isNotification
          size="lg"
          action={
            <Button
              variant="ghost"
              className="group -my-1.5 -me-2 size-8 p-0 hover:bg-transparent"
              aria-label="Close notification"
              onClick={onDismiss}
            >
              <X
                size={16}
                strokeWidth={2}
                className="opacity-60 transition-opacity group-hover:opacity-100"
              />
            </Button>
          }
        >
          <div className="flex gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              getPriorityColor(task.priority || "normal")
            )}>
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="flex grow flex-col gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  New Task Assigned
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{assignerName}</span>
                  {" "}assigned you a new task
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
                <p className="font-medium text-sm">{task.title}</p>
                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(task.due_date), "MMM d, h:mm a")}
                  </span>
                  {task.priority && task.priority !== "normal" && (
                    <span className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                      task.priority === "urgent" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" :
                      "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                    )}>
                      <Flag className="w-2.5 h-2.5" />
                      {task.priority}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Timer will start after you accept this task
              </p>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="flex-1"
                >
                  {isAccepting ? "Accepting..." : "Accept Task"}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowDeclineDialog(true)}
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      </motion.div>

      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Task</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Why are you declining this task?"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeclineDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDecline} className="flex-1">
                Decline Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
