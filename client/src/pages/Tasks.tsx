import { useState } from "react";
import { useStore, Task } from "@/lib/store";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  Search, 
  Filter, 
  User,
  Calendar,
  Briefcase
} from "lucide-react";
import Shell from "@/components/layout/Shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Tasks() {
  const { tasks, updateTask, users } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all"); // all, pending, completed

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" ? true : 
                          filterStatus === "completed" ? task.status === "Completed" : 
                          task.status !== "Completed";
    return matchesSearch && matchesStatus;
  });

  const toggleTaskStatus = (task: Task) => {
    updateTask(task.id, { 
      status: task.status === "Completed" ? "Pending" : "Completed" 
    });
  };

  return (
    <Shell>
       <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-display tracking-tight">Tasks</h1>
        </div>

        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search tasks..." 
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-1 bg-white p-1 rounded-md border">
            <Button 
              variant={filterStatus === "all" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              All
            </Button>
            <Button 
              variant={filterStatus === "pending" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFilterStatus("pending")}
            >
              Pending
            </Button>
            <Button 
               variant={filterStatus === "completed" ? "secondary" : "ghost"} 
               size="sm"
               onClick={() => setFilterStatus("completed")}
            >
              Done
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
           <div className="text-center py-12 text-muted-foreground">
            No tasks found.
          </div>
        ) : (
          filteredTasks.map(task => (
             <div 
               key={task.id} 
               className={cn(
                 "flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg shadow-sm transition-all",
                 task.status === "Completed" && "opacity-60 bg-gray-50"
               )}
             >
               <div className="flex items-center space-x-4">
                 <button 
                    onClick={() => toggleTaskStatus(task)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                      task.status === "Completed" ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-primary"
                    )}
                  >
                    {task.status === "Completed" && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  
                  <div>
                    <h3 className={cn("font-medium text-gray-900", task.status === "Completed" && "line-through")}>
                      {task.title}
                    </h3>
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-1">
                      {task.relatedTo && (
                        <span className="flex items-center bg-gray-100 px-1.5 py-0.5 rounded">
                          <Briefcase className="w-3 h-3 mr-1" />
                          {task.relatedTo.name}
                        </span>
                      )}
                      <span className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {users.find(u => u.id === task.assignedTo)?.name}
                      </span>
                      <span className={cn("flex items-center", new Date(task.dueDate) < new Date() && task.status !== "Completed" ? "text-red-500 font-bold" : "")}>
                         <Calendar className="w-3 h-3 mr-1" />
                         {format(new Date(task.dueDate), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
               </div>
               
               <div className="text-right">
                  <span className="text-xs text-gray-400 block mb-1">
                    By: {users.find(u => u.id === task.assignedBy)?.name.split(' ')[0]}
                  </span>
                  <Badge variant={task.status === "Completed" ? "secondary" : "outline"}>
                    {task.status}
                  </Badge>
               </div>
             </div>
          ))
        )}
      </div>
    </Shell>
  );
}
