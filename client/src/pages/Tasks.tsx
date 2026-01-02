import { useState } from "react";
import { useTasks, useUpdateTask, Task } from "@/hooks/use-tasks";
import { useTaskComments, useCreateTaskComment, useDeleteTaskComment } from "@/hooks/use-task-comments";
import { useProfiles, useCurrentProfile } from "@/hooks/use-profiles";
import { useLeads } from "@/hooks/use-leads";
import { useClients } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  CheckCircle2,
  Search,
  User,
  Calendar,
  Loader2,
  Lock,
  Play,
  Flag,
  RotateCcw,
  FileCheck,
  Send,
  Clock,
  MessageCircle,
  Trash2,
  Users,
  LayoutGrid,
  List
} from "lucide-react";
import Shell from "@/components/layout/Shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TaskFolder, TaskList } from "@/components/ui/task-folder";

export default function Tasks() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: profiles = [] } = useProfiles();
  const { data: currentProfile } = useCurrentProfile();
  const { data: leads = [] } = useLeads();
  const { data: clients = [] } = useClients();
  const { user } = useAuth();
  const updateTask = useUpdateTask();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssigned, setFilterAssigned] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"folder" | "list">("folder");
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [newComment, setNewComment] = useState("");

  const isAdmin = currentProfile?.role === 'admin';

  // Check if current user can modify a task
  const canModifyTask = (task: Task | any) => {
    if (!user || !currentProfile) return false;
    if (currentProfile.role === 'admin') return true;
    if (task.assigned_to === user.id) return true;
    return false;
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" ? true :
      filterStatus === "completed" ? task.status === "completed" :
      filterStatus === "in_progress" ? task.status === "in_progress" :
      task.status === "pending";
    const matchesAssigned = filterAssigned === "all" ? true :
      filterAssigned === "mine" ? task.assigned_to === user?.id : true;
    
    // Only show accepted tasks (or pending acceptance for the assigned user)
    // Admins can see all tasks
    const isAccepted = task.acceptance_status === "accepted" || !task.acceptance_status;
    const isPendingForMe = task.acceptance_status === "pending" && task.assigned_to === user?.id;
    const canSeeTask = isAdmin || isAccepted || isPendingForMe;
    
    return matchesSearch && matchesStatus && matchesAssigned && canSeeTask;
  });

  // Sort: urgent first, then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const aPriority = priorityOrder[a.priority || 'normal'];
    const bPriority = priorityOrder[b.priority || 'normal'];
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // Group tasks by assignee for folder view
  const tasksByAssignee = sortedTasks.reduce((acc, task) => {
    const assigneeId = task.assigned_to || 'unassigned';
    if (!acc[assigneeId]) {
      acc[assigneeId] = [];
    }
    acc[assigneeId].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Sort assignees: current user first, then by name
  const sortedAssigneeIds = Object.keys(tasksByAssignee).sort((a, b) => {
    if (a === user?.id) return -1;
    if (b === user?.id) return 1;
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    return getUserName(a).localeCompare(getUserName(b));
  });

  const handleStartTask = (task: Task | any) => {
    if (!canModifyTask(task)) {
      toast({ title: "Permission denied", description: "Only the assigned person can start this task.", variant: "destructive" });
      return;
    }
    // Check if task has been accepted
    if (task.acceptance_status === "pending") {
      toast({ title: "Task not accepted", description: "Please accept the task first before starting.", variant: "destructive" });
      return;
    }
    if (task.acceptance_status === "declined") {
      toast({ title: "Task declined", description: "This task was declined and cannot be started.", variant: "destructive" });
      return;
    }
    updateTask.mutate({
      id: task.id,
      status: "in_progress",
      started_at: new Date().toISOString(),
    }, {
      onSuccess: () => toast({ title: "Task started!" })
    });
  };

  const handleCompleteTask = (task: Task | any, note?: string) => {
    if (!canModifyTask(task)) {
      toast({ title: "Permission denied", description: "Only the assigned person can complete this task.", variant: "destructive" });
      return;
    }
    updateTask.mutate({
      id: task.id,
      status: "completed",
      completed_at: new Date().toISOString(),
      completion_note: note || null,
    }, {
      onSuccess: () => {
        toast({ title: "Task completed! 🎉" });
        setTaskDetailOpen(false);
        setCompletionNote("");
      }
    });
  };

  const getUserName = (id: string | null) => {
    if (!id || id === 'unassigned') return "Unassigned";
    const profile = profiles.find(p => p.id === id);
    return profile?.full_name || "Unknown";
  };

  const getRelatedName = (task: Task) => {
    if (task.related_lead_id) {
      const lead = leads.find(l => l.id === task.related_lead_id);
      return lead?.name || "Unknown Lead";
    }
    if (task.related_client_id) {
      const client = clients.find(c => c.id === task.related_client_id);
      return client?.business_name || "Unknown Client";
    }
    return null;
  };

  const isOverdue = (task: Task) => {
    return new Date(task.due_date) < new Date() && task.status !== "completed";
  };

  // Transform tasks for the folder component
  const transformTaskForFolder = (task: Task) => ({
    id: task.id,
    title: task.title,
    status: task.status as "pending" | "in_progress" | "completed",
    priority: (task.priority || "normal") as "low" | "normal" | "high" | "urgent",
    task_type: (task.task_type || "task") as "task" | "revision" | "review" | "delivery",
    due_date: task.due_date,
    assigned_to: task.assigned_to,
    related_name: getRelatedName(task),
    acceptance_status: task.acceptance_status as "pending" | "accepted" | "declined" | undefined
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  // Stats
  const myTasks = tasks.filter(t => t.assigned_to === user?.id && t.status !== "completed");
  const overdueTasks = tasks.filter(t => isOverdue(t));
  const completedToday = tasks.filter(t => t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString());
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");

  return (
    <Shell>
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight">Tasks</h1>
            {isAdmin && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Users className="w-4 h-4" />
                Viewing all team tasks
              </p>
            )}
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white border rounded-lg p-1">
            <Button
              variant={viewMode === "folder" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("folder")}
              className="h-8"
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Folders
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8"
            >
              <List className="w-4 h-4 mr-1" />
              List
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-blue-600 font-medium">My Tasks</p>
              <User className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">{myTasks.length}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-orange-600 font-medium">Overdue</p>
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-700 mt-1">{overdueTasks.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-green-600 font-medium">Done Today</p>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-700 mt-1">{completedToday.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-purple-600 font-medium">In Progress</p>
              <Play className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-700 mt-1">{inProgressTasks.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-1 bg-white p-1 rounded-lg border">
            <Button variant={filterStatus === "all" ? "secondary" : "ghost"} size="sm" onClick={() => setFilterStatus("all")}>All</Button>
            <Button variant={filterStatus === "pending" ? "secondary" : "ghost"} size="sm" onClick={() => setFilterStatus("pending")}>Pending</Button>
            <Button variant={filterStatus === "in_progress" ? "secondary" : "ghost"} size="sm" onClick={() => setFilterStatus("in_progress")}>Active</Button>
            <Button variant={filterStatus === "completed" ? "secondary" : "ghost"} size="sm" onClick={() => setFilterStatus("completed")}>Done</Button>
          </div>
          {isAdmin && (
            <div className="flex space-x-1 bg-white p-1 rounded-lg border">
              <Button variant={filterAssigned === "all" ? "secondary" : "ghost"} size="sm" onClick={() => setFilterAssigned("all")}>
                <Users className="w-3 h-3 mr-1" />
                All
              </Button>
              <Button variant={filterAssigned === "mine" ? "secondary" : "ghost"} size="sm" onClick={() => setFilterAssigned("mine")}>
                <User className="w-3 h-3 mr-1" />
                Mine
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Task Display */}
      {sortedTasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No tasks found.</p>
        </div>
      ) : viewMode === "folder" && isAdmin ? (
        /* Folder View - Grouped by Assignee (Admin Only) */
        <div className="space-y-4">
          {sortedAssigneeIds.map(assigneeId => (
            <TaskFolder
              key={assigneeId}
              title={getUserName(assigneeId)}
              assigneeName={getUserName(assigneeId)}
              tasks={tasksByAssignee[assigneeId].map(transformTaskForFolder)}
              onTaskClick={(task) => {
                const fullTask = tasks.find(t => t.id === task.id);
                if (fullTask) {
                  setSelectedTask(fullTask);
                  setTaskDetailOpen(true);
                }
              }}
              onStartTask={(task) => {
                const fullTask = tasks.find(t => t.id === task.id);
                if (fullTask) handleStartTask(fullTask);
              }}
              onCompleteTask={(task) => {
                const fullTask = tasks.find(t => t.id === task.id);
                if (fullTask) handleCompleteTask(fullTask);
              }}
              canModifyTask={canModifyTask}
              isCurrentUser={assigneeId === user?.id}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <TaskList
          tasks={sortedTasks.map(transformTaskForFolder)}
          onTaskClick={(task) => {
            const fullTask = tasks.find(t => t.id === task.id);
            if (fullTask) {
              setSelectedTask(fullTask);
              setTaskDetailOpen(true);
            }
          }}
          onStartTask={(task) => {
            const fullTask = tasks.find(t => t.id === task.id);
            if (fullTask) handleStartTask(fullTask);
          }}
          onCompleteTask={(task) => {
            const fullTask = tasks.find(t => t.id === task.id);
            if (fullTask) handleCompleteTask(fullTask);
          }}
          canModifyTask={canModifyTask}
        />
      )}

      {/* Task Detail Dialog */}
      <Dialog open={taskDetailOpen} onOpenChange={(open) => { setTaskDetailOpen(open); if (!open) setNewComment(""); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>Assigned to {getUserName(selectedTask?.assigned_to || null)}</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <TaskDetailWithComments
              task={selectedTask}
              currentProfile={currentProfile}
              user={user}
              canModifyTask={canModifyTask}
              getUserName={getUserName}
              completionNote={completionNote}
              setCompletionNote={setCompletionNote}
              newComment={newComment}
              setNewComment={setNewComment}
              handleStartTask={handleStartTask}
              handleCompleteTask={handleCompleteTask}
              profiles={profiles}
            />
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

// Task Detail with Comments Component
interface TaskDetailWithCommentsProps {
  task: Task;
  currentProfile: any;
  user: any;
  canModifyTask: (task: Task) => boolean;
  getUserName: (id: string | null) => string;
  completionNote: string;
  setCompletionNote: (note: string) => void;
  newComment: string;
  setNewComment: (comment: string) => void;
  handleStartTask: (task: Task) => void;
  handleCompleteTask: (task: Task, note?: string) => void;
  profiles: any[];
}

function TaskDetailWithComments({
  task,
  currentProfile,
  user,
  canModifyTask,
  getUserName,
  completionNote,
  setCompletionNote,
  newComment,
  setNewComment,
  handleStartTask,
  handleCompleteTask,
  profiles
}: TaskDetailWithCommentsProps) {
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(task.id);
  const createComment = useCreateTaskComment();
  const deleteComment = useDeleteTaskComment();
  const { toast } = useToast();

  const canViewComments = currentProfile?.role === 'admin' || task.assigned_to === user?.id;
  const canAddComment = task.assigned_to === user?.id && task.status === 'completed';

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast({ title: "Comment required", description: "Please enter a comment.", variant: "destructive" });
      return;
    }
    createComment.mutate({
      task_id: task.id,
      user_id: user?.id,
      comment: newComment.trim()
    }, {
      onSuccess: () => {
        toast({ title: "Comment added" });
        setNewComment("");
      },
      onError: (error) => {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
      }
    });
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm("Delete this comment?")) {
      deleteComment.mutate({ id: commentId, taskId: task.id }, {
        onSuccess: () => toast({ title: "Comment deleted" })
      });
    }
  };

  const getCommentUserName = (userId: string) => {
    const profile = profiles.find((p: any) => p.id === userId);
    return profile?.full_name || "Unknown";
  };

  const getTaskTypeIcon = (type: Task["task_type"]) => {
    switch (type) {
      case "revision": return <RotateCcw className="w-4 h-4" />;
      case "review": return <FileCheck className="w-4 h-4" />;
      case "delivery": return <Send className="w-4 h-4" />;
      default: return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getTaskTypeColor = (type: Task["task_type"]) => {
    switch (type) {
      case "revision": return "bg-orange-100 text-orange-700";
      case "review": return "bg-purple-100 text-purple-700";
      case "delivery": return "bg-green-100 text-green-700";
      default: return "bg-blue-100 text-blue-700";
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-700 border-red-200";
      case "high": return "bg-orange-100 text-orange-700 border-orange-200";
      case "normal": return "bg-gray-100 text-gray-700 border-gray-200";
      case "low": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const isOverdue = new Date(task.due_date) < new Date() && task.status !== "completed";

  return (
    <div className="space-y-4 py-4">
      {/* Task Type & Priority Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={cn("text-xs", getTaskTypeColor(task.task_type || "task"))}>
          {getTaskTypeIcon(task.task_type || "task")}
          <span className="ml-1 capitalize">{task.task_type || "task"}</span>
        </Badge>
        <Badge className={cn("text-xs border", getPriorityColor(task.priority || "normal"))}>
          <Flag className="w-3 h-3 mr-1" />
          <span className="capitalize">{task.priority || "normal"}</span>
        </Badge>
        {isOverdue && (
          <Badge className="text-xs bg-red-500 text-white animate-pulse">
            <Clock className="w-3 h-3 mr-1" />
            OVERDUE
          </Badge>
        )}
      </div>

      {task.description && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <p className="text-sm mt-1">{task.description}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 bg-gray-50 rounded-lg">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Due Date
          </Label>
          <p className={cn("mt-1 font-medium", isOverdue && "text-red-600")}>
            {format(new Date(task.due_date), "MMM d, yyyy")}
          </p>
          <p className={cn("text-xs", isOverdue && "text-red-500")}>
            {format(new Date(task.due_date), "h:mm a")}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" /> Assigned To
          </Label>
          <p className="mt-1 font-medium">{getUserName(task.assigned_to)}</p>
        </div>
        {task.started_at && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <Label className="text-xs text-blue-600">Started</Label>
            <p className="mt-1 text-blue-700">{format(new Date(task.started_at), "MMM d, h:mm a")}</p>
          </div>
        )}
        {task.completed_at && (
          <div className="p-3 bg-green-50 rounded-lg">
            <Label className="text-xs text-green-600">Completed</Label>
            <p className="mt-1 text-green-700">{format(new Date(task.completed_at), "MMM d, h:mm a")}</p>
          </div>
        )}
      </div>

      {/* Completion Note */}
      {task.completion_note && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <Label className="text-xs text-green-700 font-medium">Completion Note</Label>
          <p className="text-sm mt-1 text-green-800">{task.completion_note}</p>
        </div>
      )}

      {/* Start Task Button */}
      {canModifyTask(task) && task.status === "pending" && (
        <Button className="w-full" onClick={() => handleStartTask(task)}>
          <Play className="w-4 h-4 mr-2" />
          Start Working
        </Button>
      )}

      {/* Complete Task Section */}
      {canModifyTask(task) && task.status === "in_progress" && (
        <div className="space-y-2 pt-4 border-t">
          <Label>Completion Note (optional)</Label>
          <Textarea value={completionNote} onChange={e => setCompletionNote(e.target.value)} placeholder="Add notes..." rows={2} />
          <Button className="w-full" onClick={() => handleCompleteTask(task, completionNote)}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark as Complete
          </Button>
        </div>
      )}

      {/* Comments Section */}
      {canViewComments && task.status === "completed" && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Task Comments</Label>
            <Badge variant="secondary" className="text-xs">{comments.length}</Badge>
          </div>

          <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
            {commentsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-3">No comments yet.</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">{getCommentUserName(comment.user_id)}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800">{comment.comment}</p>
                    </div>
                    {(comment.user_id === user?.id || currentProfile?.role === 'admin') && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {canAddComment && (
            <div className="space-y-2">
              <Textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment about this task..."
                rows={2}
                className="text-sm"
              />
              <Button 
                size="sm" 
                onClick={handleAddComment} 
                disabled={createComment.isPending || !newComment.trim()}
                className="w-full"
              >
                {createComment.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MessageCircle className="w-3 h-3 mr-1" />}
                Add Comment
              </Button>
            </div>
          )}

          {currentProfile?.role === 'admin' && task.assigned_to !== user?.id && (
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Only {getUserName(task.assigned_to)} can add comments to this task.
            </p>
          )}
        </div>
      )}

      {/* Permission denied message */}
      {!canModifyTask(task) && task.status !== "completed" && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <Lock className="w-4 h-4 inline mr-2" />
          Only {getUserName(task.assigned_to)} can modify this task.
        </div>
      )}
    </div>
  );
}
