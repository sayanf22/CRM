import { useState } from "react";
import { useStore, Client, Task } from "@/lib/store";
import { format } from "date-fns";
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  User, 
  Plus, 
  PackageCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ClientDetailProps {
  clientId: string;
  onClose: () => void;
}

export default function ClientDetail({ clientId, onClose }: ClientDetailProps) {
  const { clients, tasks, updateClient, addTask, updateTask, currentUser, users } = useStore();
  const client = clients.find(c => c.id === clientId);
  const clientTasks = tasks.filter(t => t.relatedTo?.id === clientId && t.relatedTo?.type === 'client');
  const { toast } = useToast();

  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState(currentUser.id);
  const [newTaskDue, setNewTaskDue] = useState("");

  if (!client) return null;

  const isDelivered = client.status === "Delivered" || client.status === "Closed";

  const handleStatusChange = (status: Client['status']) => {
    updateClient(client.id, { status });
  };

  const handleCreateTask = () => {
    if (!newTaskTitle || !newTaskDue) {
       toast({ title: "Missing Info", description: "Title and Due Date are required", variant: "destructive" });
       return;
    }

    addTask({
      title: newTaskTitle,
      description: "Client task",
      assignedTo: newTaskAssignee,
      assignedBy: currentUser.id,
      relatedTo: { type: 'client', id: client.id, name: client.businessName },
      dueDate: new Date(newTaskDue).toISOString(),
      status: "Pending"
    });

    setNewTaskOpen(false);
    setNewTaskTitle("");
    setNewTaskDue("");
    toast({ title: "Task Created" });
  };

  const handleMarkDelivered = () => {
    if (confirm("Mark project as delivered? This will lock editing.")) {
      updateClient(client.id, { 
        status: "Delivered",
        deliveryDate: new Date().toISOString()
      });
      toast({ title: "Project Delivered! 🚀" });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-start">
        <div>
           <div className="flex items-center space-x-2 mb-1">
             <h2 className="text-2xl font-bold font-display">{client.businessName}</h2>
             <Badge variant="outline">{client.status}</Badge>
          </div>
          <p className="text-muted-foreground">{client.ownerName}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Status Selector (if not delivered) */}
        {!isDelivered && (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <Label className="mb-2 block text-xs text-muted-foreground uppercase tracking-wider">Project Status</Label>
            <Select value={client.status} onValueChange={(val: any) => handleStatusChange(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Onboarding">Onboarding</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Waiting on Client">Waiting on Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="block text-muted-foreground text-xs mb-1">Services</span>
            <div className="flex flex-wrap gap-1">
              {client.services.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
            </div>
          </div>
          <div>
            <span className="block text-muted-foreground text-xs mb-1">Start Date</span>
            <span>{format(new Date(client.startDate), "MMM d, yyyy")}</span>
          </div>
        </div>

        <Separator />

        {/* Tasks Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
              Tasks
            </h3>
            {!isDelivered && (
              <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Task for {client.businessName}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Task Title</Label>
                      <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="e.g. Design Homepage" />
                    </div>
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="datetime-local" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} />
                    </div>
                    <Button onClick={handleCreateTask} className="w-full">Create Task</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="space-y-3">
            {clientTasks.length === 0 ? (
               <p className="text-sm text-muted-foreground italic">No tasks for this client.</p>
            ) : (
              clientTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                  <div className="flex items-center space-x-3">
                    <button 
                      disabled={isDelivered}
                      onClick={() => updateTask(task.id, { status: task.status === "Completed" ? "Pending" : "Completed" })}
                      className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                        task.status === "Completed" ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-primary"
                      )}
                    >
                      {task.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                       <p className={cn("text-sm font-medium", task.status === "Completed" && "line-through text-muted-foreground")}>{task.title}</p>
                       <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                         <span className="flex items-center"><User className="w-3 h-3 mr-1"/> {users.find(u => u.id === task.assignedTo)?.name.split(' ')[0]}</span>
                         <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {format(new Date(task.dueDate), "MMM d")}</span>
                       </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{task.status}</Badge>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

       {/* Footer Actions */}
       {!isDelivered && (
        <div className="p-4 border-t bg-gray-50">
          <Button 
            className="w-full bg-primary text-white hover:bg-primary/90" 
            onClick={handleMarkDelivered}
          >
            <PackageCheck className="w-4 h-4 mr-2" />
            Mark Project as Delivered
          </Button>
        </div>
      )}
    </div>
  );
}
