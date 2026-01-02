"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { 
  CheckCircle2, 
  Clock, 
  Play, 
  Flag, 
  User,
  Calendar,
  Briefcase,
  RotateCcw,
  FileCheck,
  Send,
  Lock,
  ChevronRight
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"

interface TaskItem {
  id: string
  title: string
  status: "pending" | "in_progress" | "completed"
  priority: "low" | "normal" | "high" | "urgent"
  task_type: "task" | "revision" | "review" | "delivery"
  due_date: string
  assigned_to: string | null
  related_name?: string | null
  acceptance_status?: "pending" | "accepted" | "declined"
}

interface TaskFolderProps {
  title: string
  tasks: TaskItem[]
  assigneeName: string
  className?: string
  onTaskClick: (task: TaskItem) => void
  onStartTask: (task: TaskItem) => void
  onCompleteTask: (task: TaskItem) => void
  canModifyTask: (task: TaskItem) => boolean
  isCurrentUser?: boolean
}

export function TaskFolder({ 
  title, 
  tasks, 
  assigneeName,
  className,
  onTaskClick,
  onStartTask,
  onCompleteTask,
  canModifyTask,
  isCurrentUser = false
}: TaskFolderProps) {
  const [isExpanded, setIsExpanded] = useState(isCurrentUser)
  
  const pendingCount = tasks.filter(t => t.status === "pending" && t.acceptance_status !== "pending").length
  const awaitingAcceptanceCount = tasks.filter(t => t.acceptance_status === "pending").length
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length
  const completedCount = tasks.filter(t => t.status === "completed").length
  const overdueCount = tasks.filter(t => new Date(t.due_date) < new Date() && t.status !== "completed" && t.acceptance_status !== "pending").length

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden transition-all duration-300", className)}>
      {/* Folder Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full p-4 flex items-center justify-between",
          "bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100",
          "transition-all duration-300",
          isCurrentUser && "from-primary/10 to-primary/5"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            "bg-gradient-to-br from-amber-400 to-orange-500 shadow-md",
            "transform transition-transform duration-300",
            isExpanded && "rotate-3"
          )}>
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              {assigneeName}
              {isCurrentUser && (
                <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary">You</Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">{tasks.length} tasks</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mini Stats */}
          <div className="hidden sm:flex items-center gap-2">
            {overdueCount > 0 && (
              <Badge className="bg-red-500 text-white text-[10px]">
                {overdueCount} overdue
              </Badge>
            )}
            {awaitingAcceptanceCount > 0 && (
              <Badge className="bg-yellow-500 text-white text-[10px]">
                {awaitingAcceptanceCount} awaiting
              </Badge>
            )}
            {inProgressCount > 0 && (
              <Badge className="bg-blue-500 text-white text-[10px]">
                {inProgressCount} active
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <ChevronRight className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300",
            isExpanded && "rotate-90"
          )} />
        </div>
      </button>

      {/* Expanded Task List */}
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="p-3 space-y-2 bg-gray-50/50">
          {tasks.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No tasks assigned</p>
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onStart={() => onStartTask(task)}
                onComplete={() => onCompleteTask(task)}
                canModify={canModifyTask(task)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

interface TaskCardProps {
  task: TaskItem
  onClick: () => void
  onStart: () => void
  onComplete: () => void
  canModify: boolean
}

function TaskCard({ task, onClick, onStart, onComplete, canModify }: TaskCardProps) {
  const isOverdue = new Date(task.due_date) < new Date() && task.status !== "completed" && task.acceptance_status !== "pending"
  const isAwaitingAcceptance = task.acceptance_status === "pending"
  const isDeclined = task.acceptance_status === "declined"
  
  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case "revision": return <RotateCcw className="w-3 h-3" />
      case "review": return <FileCheck className="w-3 h-3" />
      case "delivery": return <Send className="w-3 h-3" />
      default: return <CheckCircle2 className="w-3 h-3" />
    }
  }

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case "revision": return "bg-orange-100 text-orange-700"
      case "review": return "bg-purple-100 text-purple-700"
      case "delivery": return "bg-green-100 text-green-700"
      default: return "bg-blue-100 text-blue-700"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500 text-white"
      case "high": return "bg-orange-500 text-white"
      default: return ""
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 bg-white rounded-lg border shadow-sm cursor-pointer",
        "transition-all duration-200 hover:shadow-md hover:border-primary/30",
        task.status === "completed" && "opacity-60 bg-gray-50",
        isAwaitingAcceptance && "border-l-4 border-l-yellow-500 bg-yellow-50/30",
        isDeclined && "border-l-4 border-l-gray-400 opacity-50",
        !isAwaitingAcceptance && !isDeclined && task.priority === "urgent" && task.status !== "completed" && "border-l-4 border-l-red-500",
        !isAwaitingAcceptance && !isDeclined && task.priority === "high" && task.status !== "completed" && "border-l-4 border-l-orange-500",
        isOverdue && "ring-2 ring-red-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn(
              "font-medium text-sm truncate",
              task.status === "completed" && "line-through text-muted-foreground"
            )}>
              {task.title}
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-[10px] h-5", getTaskTypeColor(task.task_type))}>
              {getTaskTypeIcon(task.task_type)}
              <span className="ml-1">{task.task_type}</span>
            </Badge>
            
            {isAwaitingAcceptance && (
              <Badge className="text-[10px] h-5 bg-yellow-100 text-yellow-700 border border-yellow-300">
                <Clock className="w-2 h-2 mr-1" />
                Awaiting Acceptance
              </Badge>
            )}
            
            {isDeclined && (
              <Badge className="text-[10px] h-5 bg-gray-100 text-gray-600 border border-gray-300">
                Declined
              </Badge>
            )}
            
            {!isAwaitingAcceptance && task.priority && task.priority !== "normal" && task.priority !== "low" && (
              <Badge className={cn("text-[10px] h-5", getPriorityColor(task.priority))}>
                <Flag className="w-2 h-2 mr-1" />
                {task.priority}
              </Badge>
            )}
            
            {isOverdue && (
              <Badge className="text-[10px] h-5 bg-red-500 text-white animate-pulse">
                <Clock className="w-2 h-2 mr-1" />
                OVERDUE
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
            {task.related_name && (
              <span className="flex items-center bg-gray-100 px-1.5 py-0.5 rounded">
                <Briefcase className="w-3 h-3 mr-1" />
                {task.related_name}
              </span>
            )}
            <span className={cn("flex items-center", isOverdue && "text-red-500 font-medium")}>
              <Calendar className="w-3 h-3 mr-1" />
              {format(new Date(task.due_date), "MMM d, h:mm a")}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Only show Start button if task is accepted */}
          {task.status === "pending" && task.acceptance_status === "accepted" && canModify && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onStart(); }}
            >
              <Play className="w-3 h-3 mr-1" />
              Start
            </Button>
          )}
          {task.status === "in_progress" && canModify && (
            <Button 
              size="sm" 
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Done
            </Button>
          )}
          {!canModify && task.status !== "completed" && !isAwaitingAcceptance && (
            <Lock className="w-4 h-4 text-gray-400" />
          )}
          <Badge 
            variant={task.status === "completed" ? "secondary" : task.status === "in_progress" ? "default" : "outline"} 
            className="text-[10px] h-5"
          >
            {isAwaitingAcceptance ? "Awaiting" : 
             task.status === "in_progress" ? "Active" : 
             task.status === "completed" ? "Done" : "Pending"}
          </Badge>
        </div>
      </div>
    </div>
  )
}

// Simple list view for non-grouped tasks
interface TaskListProps {
  tasks: TaskItem[]
  onTaskClick: (task: TaskItem) => void
  onStartTask: (task: TaskItem) => void
  onCompleteTask: (task: TaskItem) => void
  canModifyTask: (task: TaskItem) => boolean
}

export function TaskList({ tasks, onTaskClick, onStartTask, onCompleteTask, canModifyTask }: TaskListProps) {
  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={() => onTaskClick(task)}
          onStart={() => onStartTask(task)}
          onComplete={() => onCompleteTask(task)}
          canModify={canModifyTask(task)}
        />
      ))}
    </div>
  )
}
