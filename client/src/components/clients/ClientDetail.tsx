import { useState } from "react";
import { useClient, useUpdateClient, useDeleteClient, useCreateClient, Client } from "@/hooks/use-clients";
import { useTasks, useCreateTask, useUpdateTask, Task, sendTaskNotification } from "@/hooks/use-tasks";
import { useTaskComments, useCreateTaskComment, useDeleteTaskComment } from "@/hooks/use-task-comments";
import { useProfiles, useCurrentProfile } from "@/hooks/use-profiles";
import { useCreateIncomeRecord, useUpdateIncomeRecord, useIncomeRecords } from "@/hooks/use-income-records";
import { useLead } from "@/hooks/use-leads";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  X,
  CheckCircle2,
  Calendar,
  User,
  Plus,
  PackageCheck,
  Loader2,
  Trash2,
  RefreshCw,
  Lock,
  Play,
  Clock,
  Flag,
  RotateCcw,
  FileCheck,
  Send,
  MessageCircle,
  Trash2 as TrashIcon,
  DollarSign,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ClientDetailProps {
  clientId: string;
  onClose: () => void;
}

export default function ClientDetail({ clientId, onClose }: ClientDetailProps) {
  const { data: client, isLoading } = useClient(clientId);
  const { data: allTasks = [] } = useTasks();
  const { data: profiles = [] } = useProfiles();
  const { data: currentProfile } = useCurrentProfile();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const createClient = useCreateClient();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const createIncomeRecord = useCreateIncomeRecord();
  const updateIncomeRecord = useUpdateIncomeRecord();
  const { data: incomeRecords = [] } = useIncomeRecords();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get lead info for the income record
  const { data: leadInfo } = useLead(client?.lead_id || null);
  
  // Find existing income record for this client
  const existingIncomeRecord = incomeRecords.find(r => r.client_id === clientId);  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState(user?.id || "");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskType, setNewTaskType] = useState<Task["task_type"]>("task");
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("normal");
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectServices, setNewProjectServices] = useState("");
  const [newProjectValue, setNewProjectValue] = useState("");

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [newComment, setNewComment] = useState("");
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [projectValue, setProjectValue] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<Client["payment_status"]>("pending");

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) return null;

  const clientTasks = allTasks.filter(t => t.related_client_id === clientId);
  const isDelivered = client.status === "delivered" || client.status === "closed";

  // Calculate progress
  const completedTasks = clientTasks.filter(t => t.status === "completed").length;
  const totalTasks = clientTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getStatusDisplay = (status: Client["status"]) => {
    const map: Record<string, string> = {
      onboarding: "Onboarding",
      in_progress: "In Progress",
      waiting: "Waiting on Client",
      delivered: "Delivered",
      closed: "Closed"
    };
    return map[status] || status;
  };

  const getUserName = (id: string | null) => {
    if (!id) return "Unassigned";
    const profile = profiles.find(p => p.id === id);
    return profile?.full_name || "Unknown";
  };

  // Check if current user can modify a task
  const canModifyTask = (task: Task) => {
    if (!user || !currentProfile) return false;
    if (currentProfile.role === 'admin') return true;
    if (task.assigned_to === user.id) return true;
    return false;
  };

  const handleStatusChange = (status: Client['status']) => {
    updateClient.mutate({ id: client.id, status });
  };

  const handleCreateTask = () => {
    if (!newTaskTitle || !newTaskDue) {
      toast({ title: "Missing Info", description: "Title and Due Date are required", variant: "destructive" });
      return;
    }

    // Check if assigning to self - auto-accept
    const isAssigningToSelf = newTaskAssignee === user?.id;
    
    // Get the assigner's name for the notification
    const assignerProfile = profiles.find(p => p.id === user?.id);
    const assignerName = assignerProfile?.full_name || "Someone";
    
    createTask.mutate({
      title: newTaskTitle,
      description: newTaskDescription || null,
      assigned_to: newTaskAssignee,
      assigned_by: user?.id || null,
      related_lead_id: null,
      related_client_id: client.id,
      due_date: newTaskDue,
      reminder_time: null,
      status: "pending",
      task_type: newTaskType,
      priority: newTaskPriority,
      completion_note: null,
      started_at: null,
      completed_at: null,
      revision_count: 0,
      // Task acceptance - auto-accept if assigning to self
      acceptance_status: isAssigningToSelf ? "accepted" : "pending",
      accepted_at: isAssigningToSelf ? new Date().toISOString() : null,
      declined_at: null,
      decline_reason: null,
    }, {
      onSuccess: async (createdTask) => {
        setNewTaskOpen(false);
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskDue("");
        setNewTaskType("task");
        setNewTaskPriority("normal");
        toast({ title: "Task Created" });
        
        // Send push notification to assigned user (always send, even to self)
        if (newTaskAssignee) {
          console.log('Sending task notification to:', newTaskAssignee);
          const result = await sendTaskNotification(
            createdTask.id,
            newTaskAssignee,
            assignerName,
            'task_assigned'
          );
          console.log('Notification result:', result);
        }
      }
    });
  };

  const handleStartTask = (task: Task) => {
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

  const handleCompleteTask = (task: Task, note?: string) => {
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

  const handleRequestRevision = (task: Task) => {
    // Create a revision task - requires acceptance from assignee
    const isAssigningToSelf = task.assigned_to === user?.id;
    
    // Get the assigner's name for the notification
    const assignerProfile = profiles.find(p => p.id === user?.id);
    const assignerName = assignerProfile?.full_name || "Someone";
    
    createTask.mutate({
      title: `Revision: ${task.title}`,
      description: `Revision requested for: ${task.title}`,
      assigned_to: task.assigned_to,
      assigned_by: user?.id || null,
      related_lead_id: null,
      related_client_id: client.id,
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      reminder_time: null,
      status: "pending",
      task_type: "revision",
      priority: "high",
      completion_note: null,
      started_at: null,
      completed_at: null,
      revision_count: (task.revision_count || 0) + 1,
      // Task acceptance - auto-accept if assigning to self
      acceptance_status: isAssigningToSelf ? "accepted" : "pending",
      accepted_at: isAssigningToSelf ? new Date().toISOString() : null,
      declined_at: null,
      decline_reason: null,
    }, {
      onSuccess: async (createdTask) => {
        toast({ title: "Revision requested", description: "A new revision task has been created." });
        
        // Send push notification to assigned user (always send)
        if (task.assigned_to) {
          console.log('Sending revision notification to:', task.assigned_to);
          await sendTaskNotification(
            createdTask.id,
            task.assigned_to,
            assignerName,
            'task_assigned'
          );
        }
      }
    });
  };

  const handleMarkDelivered = () => {
    // Check if project value is set
    if (!client.project_value || client.project_value === 0) {
      toast({ 
        title: "Project Value Required", 
        description: "Please set the project value before marking as delivered.", 
        variant: "destructive" 
      });
      setPaymentDialogOpen(true);
      return;
    }
    
    if (confirm("Mark project as delivered? This will create an income record for financials.")) {
      // First update the client status
      updateClient.mutate({
        id: client.id,
        status: "delivered",
        delivery_date: new Date().toISOString(),
        delivered_by: user?.id || null,
      }, {
        onSuccess: () => {
          // Create income record for permanent financial tracking
          createIncomeRecord.mutate({
            client_id: client.id,
            business_name: client.business_name,
            owner_name: client.owner_name,
            phone: client.phone,
            services: client.services,
            project_value: client.project_value || 0,
            paid_amount: client.paid_amount || 0,
            payment_status: client.payment_status || "pending",
            payment_date: client.payment_date,
            delivery_date: new Date().toISOString(),
            delivered_by: user?.id || null,
            notes: client.delivery_notes,
            lead_source: leadInfo?.source || null,
            business_category: leadInfo?.business_category || null,
            project_start_date: client.start_date,
          }, {
            onSuccess: () => {
              toast({ title: "Project Delivered! 🚀", description: "Income record created for financials." });
            },
            onError: () => {
              toast({ title: "Project Delivered! 🚀", description: "Note: Could not create income record." });
            }
          });
        }
      });
    }
  };

  const handleDeleteClient = () => {
    if (deleteConfirmText !== "CONFIRM") {
      toast({ title: "Confirmation required", description: "Please type CONFIRM to delete.", variant: "destructive" });
      return;
    }
    deleteClient.mutate(client.id, {
      onSuccess: () => {
        toast({ title: "Client deleted", description: `${client.business_name} has been removed.` });
        setDeleteDialogOpen(false);
        onClose();
      },
      onError: (error) => {
        toast({ 
          title: "Delete failed", 
          description: (error as Error).message || "Could not delete client. Please try again.", 
          variant: "destructive" 
        });
      }
    });
  };

  const handleStartNewProject = () => {
    createClient.mutate({
      lead_id: client.lead_id,
      business_name: client.business_name,
      owner_name: client.owner_name,
      phone: client.phone,
      address: client.address,
      services: newProjectServices ? newProjectServices.split(',').map(s => s.trim()) : [],
      start_date: new Date().toISOString().split('T')[0],
      delivery_date: null,
      delivered_by: null,
      status: "onboarding",
      delivery_notes: null,
      project_value: parseFloat(newProjectValue) || 0,
      payment_status: "pending",
      paid_amount: 0,
      payment_date: null,
    }, {
      onSuccess: () => {
        toast({ title: "New Project Started!" });
        setNewProjectOpen(false);
        setNewProjectServices("");
        setNewProjectValue("");
      }
    });
  };

  const getTaskTypeIcon = (type: Task["task_type"]) => {
    switch (type) {
      case "revision": return <RotateCcw className="w-3 h-3" />;
      case "review": return <FileCheck className="w-3 h-3" />;
      case "delivery": return <Send className="w-3 h-3" />;
      default: return <CheckCircle2 className="w-3 h-3" />;
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
      case "urgent": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "normal": return "bg-gray-100 text-gray-700";
      case "low": return "bg-slate-100 text-slate-600";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h2 className="text-2xl font-bold font-display">{client.business_name}</h2>
            <Badge variant="outline">{getStatusDisplay(client.status)}</Badge>
          </div>
          <p className="text-muted-foreground">{client.owner_name}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Progress Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Project Progress</span>
            <span className="text-sm font-bold text-blue-700">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-blue-600 mt-2">{completedTasks} of {totalTasks} tasks completed</p>
        </div>

        {/* Status Selector */}
        {!isDelivered && (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <Label className="mb-2 block text-xs text-muted-foreground uppercase tracking-wider">Project Status</Label>
            <Select value={client.status} onValueChange={(val: any) => handleStatusChange(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting">Waiting on Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="block text-muted-foreground text-xs mb-1">Services</span>
            <div className="flex flex-wrap gap-1">
              {client.services && client.services.length > 0
                ? client.services.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)
                : <span className="text-muted-foreground text-xs">No services listed</span>
              }
            </div>
          </div>
          <div>
            <span className="block text-muted-foreground text-xs mb-1">Start Date</span>
            <span>{client.start_date ? format(new Date(client.start_date), "MMM d, yyyy") : "Not set"}</span>
          </div>
        </div>

        {/* Project Value & Payment Section - Admin Only */}
        {currentProfile?.role === 'admin' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center text-green-800">
                <DollarSign className="w-4 h-4 mr-2" />
                Project Financials
              </h3>
              <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
                setPaymentDialogOpen(open);
                if (open) {
                  // Initialize with current values when opening
                  setProjectValue(client.project_value?.toString() || "");
                  setPaymentStatus(client.payment_status || "pending");
                  setPaidAmount(client.paid_amount?.toString() || "");
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-100">
                    <CreditCard className="w-3 h-3 mr-1" />
                    Update
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Project Financials</DialogTitle>
                    <DialogDescription>Set the project value and payment status</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Project Value (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={projectValue}
                        onChange={(e) => setProjectValue(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Status</Label>
                      <Select 
                        value={paymentStatus} 
                        onValueChange={(v: any) => setPaymentStatus(v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="partial">Partial Payment</SelectItem>
                          <SelectItem value="paid">Fully Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {paymentStatus === "partial" && (
                      <div className="space-y-2">
                        <Label>Amount Paid (₹)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                        />
                      </div>
                    )}
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        const value = parseFloat(projectValue) || 0;
                        const paid = paymentStatus === "paid" 
                          ? value 
                          : paymentStatus === "partial" 
                            ? parseFloat(paidAmount) || 0 
                            : 0;
                        const newPaymentDate = paymentStatus === "paid" ? new Date().toISOString() : client.payment_date;
                        
                        updateClient.mutate({
                          id: client.id,
                          project_value: value,
                          payment_status: paymentStatus || client.payment_status,
                          paid_amount: paid,
                          payment_date: newPaymentDate,
                        }, {
                          onSuccess: () => {
                            // Also update income record if it exists
                            if (existingIncomeRecord) {
                              updateIncomeRecord.mutate({
                                id: existingIncomeRecord.id,
                                project_value: value,
                                paid_amount: paid,
                                payment_status: paymentStatus || client.payment_status,
                                payment_date: newPaymentDate,
                              });
                            }
                            toast({ title: "Financials updated" });
                            setPaymentDialogOpen(false);
                            setProjectValue("");
                            setPaidAmount("");
                          }
                        });
                      }}
                      disabled={updateClient.isPending}
                    >
                      {updateClient.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Save Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-white/50 rounded-lg">
                <p className="text-[10px] text-green-600 uppercase tracking-wider">Value</p>
                <p className="text-lg font-bold text-green-800">
                  ₹{(client.project_value || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-center p-2 bg-white/50 rounded-lg">
                <p className="text-[10px] text-green-600 uppercase tracking-wider">Paid</p>
                <p className="text-lg font-bold text-green-800">
                  ₹{(client.paid_amount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-center p-2 bg-white/50 rounded-lg">
                <p className="text-[10px] text-green-600 uppercase tracking-wider">Status</p>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs mt-1",
                    client.payment_status === 'paid' && "bg-green-200 text-green-800",
                    client.payment_status === 'partial' && "bg-yellow-200 text-yellow-800",
                    client.payment_status === 'pending' && "bg-gray-200 text-gray-700"
                  )}
                >
                  {client.payment_status === 'paid' ? 'Paid' : 
                   client.payment_status === 'partial' ? 'Partial' : 'Pending'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Tasks Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
              Tasks ({clientTasks.length})
            </h3>
            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>New Task for {client.business_name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Task Title *</Label>
                    <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="e.g. Design Homepage" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} placeholder="Task details..." rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Task Type</Label>
                      <Select value={newTaskType} onValueChange={(v: any) => setNewTaskType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="revision">Revision</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="delivery">Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={newTaskPriority} onValueChange={(v: any) => setNewTaskPriority(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign To *</Label>
                    <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date & Time *</Label>
                    <DateTimePicker value={newTaskDue} onChange={setNewTaskDue} />
                  </div>
                  <Button onClick={handleCreateTask} className="w-full" disabled={createTask.isPending}>
                    {createTask.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Create Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {clientTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-8">No tasks yet. Add a task to get started.</p>
            ) : (
              clientTasks.map(task => (
                <div 
                  key={task.id} 
                  className={cn(
                    "p-4 bg-white border rounded-lg shadow-sm transition-all hover:shadow-md cursor-pointer",
                    task.status === "completed" && "opacity-60 bg-gray-50",
                    task.acceptance_status === "pending" && "border-l-4 border-l-yellow-500 bg-yellow-50/30",
                    task.acceptance_status === "declined" && "border-l-4 border-l-gray-400 opacity-50",
                    task.priority === "urgent" && task.status !== "completed" && task.acceptance_status !== "pending" && "border-l-4 border-l-red-500",
                    task.priority === "high" && task.status !== "completed" && task.acceptance_status !== "pending" && "border-l-4 border-l-orange-500"
                  )}
                  onClick={() => { setSelectedTask(task); setTaskDetailOpen(true); }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn("text-sm font-medium", task.status === "completed" && "line-through text-muted-foreground")}>
                          {task.title}
                        </span>
                        <Badge className={cn("text-[10px]", getTaskTypeColor(task.task_type))}>
                          {getTaskTypeIcon(task.task_type)}
                          <span className="ml-1">{task.task_type}</span>
                        </Badge>
                        {task.acceptance_status === "pending" && (
                          <Badge className="text-[10px] bg-yellow-100 text-yellow-700 border border-yellow-300">
                            <Clock className="w-2 h-2 mr-1" />
                            Awaiting Acceptance
                          </Badge>
                        )}
                        {task.acceptance_status === "declined" && (
                          <Badge className="text-[10px] bg-gray-100 text-gray-600 border border-gray-300">
                            Declined
                          </Badge>
                        )}
                        {task.priority !== "normal" && task.acceptance_status !== "pending" && (
                          <Badge className={cn("text-[10px]", getPriorityColor(task.priority))}>
                            <Flag className="w-2 h-2 mr-1" />
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {getUserName(task.assigned_to)}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(task.due_date), "MMM d, h:mm a")}
                        </span>
                        {task.revision_count > 0 && (
                          <span className="flex items-center text-orange-600">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Rev {task.revision_count}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Only show Start button if task is accepted */}
                      {task.status === "pending" && task.acceptance_status === "accepted" && canModifyTask(task) && (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStartTask(task); }}>
                          <Play className="w-3 h-3 mr-1" />
                          Start
                        </Button>
                      )}
                      {task.status === "in_progress" && canModifyTask(task) && (
                        <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); handleCompleteTask(task); }}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Done
                        </Button>
                      )}
                      {!canModifyTask(task) && task.status !== "completed" && task.acceptance_status !== "pending" && (
                        <Lock className="w-4 h-4 text-gray-400" />
                      )}
                      <Badge variant={task.status === "completed" ? "secondary" : "outline"} className="text-xs">
                        {task.acceptance_status === "pending" ? "Pending" : 
                         task.status === "in_progress" ? "In Progress" : task.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={taskDetailOpen} onOpenChange={(open) => { setTaskDetailOpen(open); if (!open) setNewComment(""); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>
              Assigned to {getUserName(selectedTask?.assigned_to || null)}
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <TaskDetailContent 
              task={selectedTask}
              currentProfile={currentProfile}
              user={user}
              canModifyTask={canModifyTask}
              getUserName={getUserName}
              completionNote={completionNote}
              setCompletionNote={setCompletionNote}
              newComment={newComment}
              setNewComment={setNewComment}
              handleCompleteTask={handleCompleteTask}
              handleRequestRevision={handleRequestRevision}
              setTaskDetailOpen={setTaskDetailOpen}
              profiles={profiles}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-gray-50 space-y-3">
        {!isDelivered ? (
          <Button
            className="w-full bg-primary text-white hover:bg-primary/90"
            onClick={handleMarkDelivered}
            disabled={updateClient.isPending}
          >
            {updateClient.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackageCheck className="w-4 h-4 mr-2" />}
            Mark Project as Delivered
          </Button>
        ) : (
          <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-primary text-white hover:bg-primary/90">
                <RefreshCw className="w-4 h-4 mr-2" />
                Start New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Project</DialogTitle>
                <DialogDescription>Create a new project for {client.business_name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Services (comma separated)</Label>
                  <Input value={newProjectServices} onChange={e => setNewProjectServices(e.target.value)} placeholder="e.g. Website, SEO" />
                </div>
                <div className="space-y-2">
                  <Label>Project Value (₹)</Label>
                  <Input 
                    type="number" 
                    value={newProjectValue} 
                    onChange={e => setNewProjectValue(e.target.value)} 
                    placeholder="0" 
                  />
                </div>
                <Button onClick={handleStartNewProject} className="w-full" disabled={createClient.isPending}>
                  {createClient.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmText(""); }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full text-red-600 hover:bg-red-50 border-red-200">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Client</DialogTitle>
              <DialogDescription>This will permanently delete {client.business_name}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">Type <span className="font-bold">CONFIRM</span> to delete:</p>
              </div>
              <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="Type CONFIRM" />
              <Button onClick={handleDeleteClient} className="w-full bg-red-600 hover:bg-red-700" disabled={deleteConfirmText !== "CONFIRM" || deleteClient.isPending}>
                {deleteClient.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete Permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Task Detail Content Component with Comments
interface TaskDetailContentProps {
  task: Task;
  currentProfile: any;
  user: any;
  canModifyTask: (task: Task) => boolean;
  getUserName: (id: string | null) => string;
  completionNote: string;
  setCompletionNote: (note: string) => void;
  newComment: string;
  setNewComment: (comment: string) => void;
  handleCompleteTask: (task: Task, note?: string) => void;
  handleRequestRevision: (task: Task) => void;
  setTaskDetailOpen: (open: boolean) => void;
  profiles: any[];
}

function TaskDetailContent({
  task,
  currentProfile,
  user,
  canModifyTask,
  getUserName,
  completionNote,
  setCompletionNote,
  newComment,
  setNewComment,
  handleCompleteTask,
  handleRequestRevision,
  setTaskDetailOpen,
  profiles
}: TaskDetailContentProps) {
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(task.id);
  const createComment = useCreateTaskComment();
  const deleteComment = useDeleteTaskComment();
  const { toast } = useToast();

  // Check if user can view comments (admin or assigned person)
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
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || "Unknown";
  };

  return (
    <div className="space-y-4 py-4">
      {task.description && (
        <div>
          <Label className="text-xs text-muted-foreground">Description</Label>
          <p className="text-sm mt-1">{task.description}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <Label className="text-xs text-muted-foreground">Due Date</Label>
          <p>{format(new Date(task.due_date), "MMM d, yyyy 'at' h:mm a")}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <p className="capitalize">{task.status.replace("_", " ")}</p>
        </div>
        {task.started_at && (
          <div>
            <Label className="text-xs text-muted-foreground">Started</Label>
            <p>{format(new Date(task.started_at), "MMM d, h:mm a")}</p>
          </div>
        )}
        {task.completed_at && (
          <div>
            <Label className="text-xs text-muted-foreground">Completed</Label>
            <p>{format(new Date(task.completed_at), "MMM d, h:mm a")}</p>
          </div>
        )}
      </div>

      {/* Completion Note Section */}
      {task.completion_note && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <Label className="text-xs text-green-700 font-medium">Completion Note</Label>
          <p className="text-sm mt-1 text-green-800">{task.completion_note}</p>
        </div>
      )}

      {/* Mark Complete Section */}
      {canModifyTask(task) && task.status === "in_progress" && (
        <div className="space-y-2 pt-4 border-t">
          <Label>Completion Note (optional)</Label>
          <Textarea 
            value={completionNote} 
            onChange={e => setCompletionNote(e.target.value)} 
            placeholder="Add notes about the completed work..."
            rows={2}
          />
          <Button className="w-full" onClick={() => handleCompleteTask(task, completionNote)}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark as Complete
          </Button>
        </div>
      )}

      {/* Comments Section - Only visible to admin or assigned person */}
      {canViewComments && task.status === "completed" && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Task Comments</Label>
            <Badge variant="secondary" className="text-xs">{comments.length}</Badge>
          </div>

          {/* Comments List */}
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
                        <TrashIcon className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment - Only for assigned person after task completion */}
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

          {/* Info for admin viewing */}
          {currentProfile?.role === 'admin' && task.assigned_to !== user?.id && (
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Only {getUserName(task.assigned_to)} can add comments to this task.
            </p>
          )}
        </div>
      )}

      {/* Request Revision - Admin only */}
      {currentProfile?.role === 'admin' && task.status === "completed" && (
        <div className="pt-4 border-t">
          <Button variant="outline" className="w-full text-orange-600" onClick={() => handleRequestRevision(task)}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Request Revision
          </Button>
        </div>
      )}
    </div>
  );
}
