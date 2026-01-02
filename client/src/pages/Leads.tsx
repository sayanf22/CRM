import { useState } from "react";
import { useLeads, useUpdateLead, Lead } from "@/hooks/use-leads";
import {
  Phone,
  Search,
  Filter,
  ChevronRight,
  Plus,
  Loader2,
  AlertTriangle,
  Flag,
  CheckCircle2,
  PhoneCall,
  Clock,
  PhoneOff
} from "lucide-react";
import Shell from "@/components/layout/Shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import LeadDetail from "@/components/leads/LeadDetail";
import CountdownTimer from "@/components/leads/CountdownTimer";
import { AddLeadForm } from "@/components/leads/AddLeadForm";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Leads() {
  const { data: leads = [], isLoading } = useLeads();
  const updateLead = useUpdateLead();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCallStatus, setFilterCallStatus] = useState<string>("pending"); // "all" | "pending" | "done"
  const [showPriorityFollowUps, setShowPriorityFollowUps] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Filter leads based on search, priority, and follow-up status
  // Auto-escalate: if follow-up time has passed and status is pending, auto-convert to URGENT
  const processedLeads = leads.map(lead => {
    // Check if follow-up date has arrived (today or past) and follow-up is pending
    const followUpDateArrived = !!(lead.next_follow_up && new Date(lead.next_follow_up) <= new Date());
    const isOverdue = followUpDateArrived && lead.follow_up_status === 'pending';
    
    // Check if this is a new lead (no follow-up scheduled yet) - needs initial call
    const isNewLead = !lead.next_follow_up && !lead.last_contact;
    
    // Check if follow-up was done but new follow-up date has arrived
    // This happens when: follow_up_status is 'done' but next_follow_up date is today or past
    const followUpDoneButNewDateArrived = !!(lead.follow_up_status === 'done' && 
      lead.next_follow_up && 
      new Date(lead.next_follow_up) <= new Date());
    
    // Needs call if: new lead, overdue, or follow-up date arrived after previous call was done
    const needsCall = isNewLead || isOverdue || followUpDoneButNewDateArrived;
    
    // Auto-escalate to URGENT if follow-up is overdue
    const priority = isOverdue ? 'urgent' as const : lead.priority;
    
    return { 
      ...lead, 
      priority,
      _isOverdue: isOverdue, 
      _needsCall: needsCall,
      _isNewLead: isNewLead,
      _followUpDoneButNewDateArrived: followUpDoneButNewDateArrived
    };
  });

  // Separate done calls for today (calls that were completed today and don't need another call yet)
  const doneCallsToday = processedLeads.filter(lead => {
    if (!lead.last_contact) return false;
    const lastContactToday = isToday(new Date(lead.last_contact));
    // Show in done section if: called today AND doesn't need another call yet
    return lastContactToday && !lead._needsCall;
  });

  // Pending calls: leads that need to be called
  const pendingCalls = processedLeads.filter(lead => lead._needsCall);

  const filteredLeads = processedLeads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.business_name?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    const matchesPriority = filterPriority === "all" || lead.priority === filterPriority;
    
    // Filter by call status
    let matchesCallStatus = true;
    if (filterCallStatus === "pending") {
      matchesCallStatus = lead._needsCall === true;
    } else if (filterCallStatus === "done") {
      // Done means: has been called and doesn't need another call yet
      matchesCallStatus = !!(lead.last_contact && !lead._needsCall);
    }
    // "all" shows everything
    
    // Priority follow-ups: show only overdue leads with pending follow-up status
    const matchesFollowUp = !showPriorityFollowUps || lead._isOverdue;
    
    return matchesSearch && matchesPriority && matchesCallStatus && matchesFollowUp;
  });

  // Sort by priority (urgent first) then by follow-up date
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const aPriority = priorityOrder[a.priority || 'normal'];
    const bPriority = priorityOrder[b.priority || 'normal'];
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Then sort by follow-up date (overdue first)
    if (a.next_follow_up && b.next_follow_up) {
      return new Date(a.next_follow_up).getTime() - new Date(b.next_follow_up).getTime();
    }
    return 0;
  });

  // Count priority follow-ups (overdue and pending)
  const priorityFollowUpsCount = processedLeads.filter(lead => lead._isOverdue).length;
  const pendingCallsCount = pendingCalls.length;
  const doneCallsCount = processedLeads.filter(lead => lead.last_contact && !lead._needsCall).length;

  const getInterestColor = (level: number) => {
    if (level <= 30) return "bg-red-500";
    if (level <= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusDisplay = (status: Lead["status"]) => {
    const map: Record<string, string> = {
      not_interested: "Not Interested",
      not_sure: "Not Sure",
      interested: "Interested",
      converted: "Converted"
    };
    return map[status] || status;
  };

  const getStatusColor = (status: Lead["status"]) => {
    switch (status) {
      case "interested": return "bg-green-100 text-green-700";
      case "not_interested": return "bg-red-100 text-red-700";
      case "not_sure": return "bg-yellow-100 text-yellow-700";
      case "converted": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "normal": return "bg-blue-100 text-blue-700";
      case "low": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsDetailOpen(true);
  };

  // Mark call as done - updates last_contact and follow_up_status
  const handleMarkCallDone = (e: React.MouseEvent, lead: Lead & { _needsCall?: boolean }) => {
    e.stopPropagation(); // Prevent opening lead detail
    
    updateLead.mutate({
      id: lead.id,
      last_contact: new Date().toISOString(),
      follow_up_status: 'done',
    }, {
      onSuccess: () => {
        toast({ 
          title: "Call marked as done ✓", 
          description: `${lead.name} - Set a follow-up date in lead details for next call.` 
        });
      },
      onError: (error) => {
        toast({ 
          title: "Error", 
          description: (error as Error).message, 
          variant: "destructive" 
        });
      }
    });
  };

  // Mark as no response
  const handleNoResponse = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    
    // Set next follow-up to tomorrow same time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    updateLead.mutate({
      id: lead.id,
      last_contact: new Date().toISOString(),
      follow_up_status: 'done',
      next_follow_up: tomorrow.toISOString(),
      notes: lead.notes 
        ? `${lead.notes}\n\n[${new Date().toISOString()}] no_response: No answer, will try again tomorrow`
        : `[${new Date().toISOString()}] no_response: No answer, will try again tomorrow`,
    }, {
      onSuccess: () => {
        toast({ 
          title: "No response logged", 
          description: `Will follow up with ${lead.name} tomorrow.` 
        });
      }
    });
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-display tracking-tight">Leads</h1>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[140px] bg-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Call Status Filter */}
          <div className="flex space-x-1 bg-white p-1 rounded-lg border">
            <Button 
              variant={filterCallStatus === "pending" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFilterCallStatus("pending")}
              className="h-8"
            >
              <Clock className="w-3 h-3 mr-1" />
              Pending
              <Badge variant="secondary" className="ml-1 text-[10px] h-5">{pendingCallsCount}</Badge>
            </Button>
            <Button 
              variant={filterCallStatus === "done" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFilterCallStatus("done")}
              className="h-8"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Done
              <Badge variant="secondary" className="ml-1 text-[10px] h-5">{doneCallsCount}</Badge>
            </Button>
            <Button 
              variant={filterCallStatus === "all" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFilterCallStatus("all")}
              className="h-8"
            >
              All
            </Button>
          </div>
          
          <Button 
            variant={showPriorityFollowUps ? "default" : "outline"} 
            className={cn("bg-white", showPriorityFollowUps && "bg-orange-500 hover:bg-orange-600 text-white")}
            onClick={() => setShowPriorityFollowUps(!showPriorityFollowUps)}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Priority Follow-ups
            {priorityFollowUpsCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white/20 text-inherit">
                {priorityFollowUpsCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-600 font-medium">New Leads</p>
            <Phone className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-blue-700 mt-1">
            {processedLeads.filter(l => l._isNewLead).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-orange-600 font-medium">Pending Calls</p>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-xl font-bold text-orange-700 mt-1">{pendingCallsCount}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-green-600 font-medium">Done Today</p>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xl font-bold text-green-700 mt-1">{doneCallsToday.length}</p>
        </div>
      </div>

      {/* Done Calls Today Section */}
      {doneCallsToday.length > 0 && filterCallStatus !== "pending" && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <PhoneCall className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Done Calls Today</h2>
              <p className="text-xs text-muted-foreground">{doneCallsToday.length} calls completed</p>
            </div>
          </div>
          <div className="grid gap-2">
            {doneCallsToday.map((lead) => (
              <div
                key={lead.id}
                onClick={() => handleLeadClick(lead)}
                className="group relative bg-green-50 border border-green-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-green-300 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-gray-900">{lead.name}</h3>
                      <p className="text-xs text-gray-500">{lead.business_name || "No business"}</p>
                      {lead.next_follow_up && (
                        <p className="text-[10px] text-blue-600 mt-0.5">
                          Next follow-up: {format(new Date(lead.next_follow_up), "MMM d, h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn("text-xs", getStatusColor(lead.status))}>
                      {getStatusDisplay(lead.status)}
                    </Badge>
                    {lead.last_contact && (
                      <span className="text-xs text-green-600 font-medium">
                        {format(new Date(lead.last_contact), "h:mm a")}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {sortedLeads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => handleLeadClick(lead)}
            className={cn(
              "group relative bg-white border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300",
              lead.priority === "urgent" && "border-l-4 border-l-red-500 bg-red-50/30",
              lead.priority === "high" && "border-l-4 border-l-orange-500",
              lead._isOverdue && "ring-2 ring-red-200",
              lead._isNewLead && "border-l-4 border-l-blue-500 bg-blue-50/30"
            )}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-1">
                  <h3 className="font-semibold text-lg text-gray-900">{lead.name}</h3>
                  <Badge variant="secondary" className={cn("text-xs font-normal", getStatusColor(lead.status))}>
                    {getStatusDisplay(lead.status)}
                  </Badge>
                  {lead._isNewLead && (
                    <Badge className="text-xs bg-blue-500 text-white">
                      NEW
                    </Badge>
                  )}
                  {!lead._needsCall && lead.last_contact && (
                    <Badge className="text-xs bg-green-100 text-green-700 border border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Called
                    </Badge>
                  )}
                  {lead._isOverdue && (
                    <Badge className="text-xs bg-red-500 text-white animate-pulse">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      CALL NOW
                    </Badge>
                  )}
                  {lead._followUpDoneButNewDateArrived && !lead._isOverdue && (
                    <Badge className="text-xs bg-orange-500 text-white">
                      <Phone className="w-3 h-3 mr-1" />
                      Follow-up Due
                    </Badge>
                  )}
                  {lead.priority && lead.priority !== "normal" && !lead._isOverdue && (
                    <Badge className={cn("text-xs", getPriorityColor(lead.priority))}>
                      <Flag className="w-3 h-3 mr-1" />
                      {lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">{lead.business_name || "No business"}</p>

                <div className="flex items-center mt-3 text-xs text-muted-foreground space-x-4 flex-wrap gap-2">
                  <span className="flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {lead.phone || "No phone"}
                  </span>
                  {lead.next_follow_up && (
                    <CountdownTimer targetDate={lead.next_follow_up} />
                  )}
                  {lead.last_contact && (
                    <span className="flex items-center text-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Last: {format(new Date(lead.last_contact), "MMM d, h:mm a")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end space-y-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-500", getInterestColor(lead.interest_level))}
                    style={{ width: `${lead.interest_level}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 font-medium">{lead.interest_level}% Interest</span>
                
                {/* Quick Action Buttons - Only show for leads that need calls */}
                {lead._needsCall && (
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      onClick={(e) => handleMarkCallDone(e, lead)}
                      disabled={updateLead.isPending}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      onClick={(e) => handleNoResponse(e, lead)}
                      disabled={updateLead.isPending}
                    >
                      <PhoneOff className="w-3 h-3 mr-1" />
                      No Answer
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          </div>
        ))}

        {sortedLeads.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm || filterPriority !== "all" || showPriorityFollowUps 
              ? "No leads match your filters" 
              : "No leads yet. Add your first lead!"}
          </div>
        )}
      </div>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 overflow-y-auto">
          {selectedLeadId && (
            <LeadDetail
              leadId={selectedLeadId}
              onClose={() => setIsDetailOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Add Lead Multi-Step Form Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <AddLeadForm 
            onComplete={() => setIsAddOpen(false)} 
            onCancel={() => setIsAddOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </Shell >
  );
}
