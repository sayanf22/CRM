import { useState, useEffect } from "react";
import { useLead, useUpdateLead, useDeleteLead, Lead } from "@/hooks/use-leads";
import { useCreateClient } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  Phone,
  MessageSquare,
  History,
  CheckCircle2,
  X,
  ArrowRight,
  Loader2,
  Clock,
  Flag,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import CountdownTimer from "./CountdownTimer";

interface LeadDetailProps {
  leadId: string;
  onClose: () => void;
}

export default function LeadDetail({ leadId, onClose }: LeadDetailProps) {
  const { data: lead, isLoading } = useLead(leadId);
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const createClient = useCreateClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [callSummary, setCallSummary] = useState("");
  const [callOutcome, setCallOutcome] = useState("call_back");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [interestLevel, setInterestLevel] = useState(50);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  // Mark call done dialog state
  const [markDoneDialogOpen, setMarkDoneDialogOpen] = useState(false);
  const [markDoneComment, setMarkDoneComment] = useState("");
  const [markDoneNextCall, setMarkDoneNextCall] = useState("");

  useEffect(() => {
    if (lead) {
      setInterestLevel(lead.interest_level);
    }
  }, [lead?.id]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) return null;

  const getStatusDisplay = (status: Lead["status"]) => {
    const map: Record<string, string> = {
      not_interested: "Not Interested",
      not_sure: "Not Sure",
      interested: "Interested",
      converted: "Converted"
    };
    return map[status] || status;
  };

  const handleSaveCall = () => {
    if (!callSummary) {
      toast({
        title: "Summary Required",
        description: "Please write a summary of the call.",
        variant: "destructive"
      });
      return;
    }

    const updates: Partial<Lead> & { id: string } = {
      id: lead.id,
      last_contact: new Date().toISOString(),
      interest_level: interestLevel,
      follow_up_status: 'done', // Mark current follow-up as done
      notes: lead.notes
        ? `${lead.notes}\n\n[${new Date().toISOString()}] ${callOutcome}: ${callSummary}`
        : `[${new Date().toISOString()}] ${callOutcome}: ${callSummary}`,
    };

    if (callOutcome === 'not_interested') {
      updates.status = "not_interested";
      updates.next_follow_up = null;
    } else if (callOutcome === 'interested') {
      updates.status = "interested";
    }

    if (nextFollowUpDate) {
      updates.next_follow_up = new Date(nextFollowUpDate).toISOString();
      updates.follow_up_status = 'pending'; // Reset for new follow-up
    }

    updateLead.mutate(updates, {
      onSuccess: () => {
        toast({ title: "Call Logged", description: "Lead updated successfully." });
        setCallSummary("");
        setCallOutcome("call_back");
        setNextFollowUpDate("");
      }
    });
  };

  const handleConvertToClient = () => {
    if (confirm("Are you sure you want to convert this lead to a client?")) {
      // First update lead status
      updateLead.mutate({ id: lead.id, status: "converted" });

      // Then create client
      createClient.mutate({
        lead_id: lead.id,
        business_name: lead.business_name || lead.name,
        owner_name: lead.name,
        phone: lead.phone,
        address: null,
        services: [],
        start_date: new Date().toISOString().split('T')[0],
        delivery_date: null,
        delivered_by: null,
        status: "onboarding",
        delivery_notes: null,
        project_value: 0,
        payment_status: "pending",
        paid_amount: 0,
        payment_date: null,
      }, {
        onSuccess: () => {
          toast({ title: "Converted!", description: `${lead.name} is now a client.` });
          onClose();
        }
      });
    }
  };

  const handleDeleteLead = () => {
    if (deleteConfirmText !== "CONFIRM") {
      toast({
        title: "Confirmation required",
        description: "Please type CONFIRM to delete this lead.",
        variant: "destructive"
      });
      return;
    }

    deleteLead.mutate(lead.id, {
      onSuccess: () => {
        toast({ title: "Lead deleted", description: `${lead.name} has been removed.` });
        setDeleteDialogOpen(false);
        onClose();
      },
      onError: (error) => {
        toast({
          title: "Delete failed",
          description: (error as Error).message,
          variant: "destructive"
        });
      }
    });
  };

  // Handle marking call as done with comment and next call date
  const handleMarkCallDone = () => {
    // Validate required fields
    if (!markDoneComment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please add notes about the conversation.",
        variant: "destructive"
      });
      return;
    }

    if (!markDoneNextCall) {
      toast({
        title: "Next Call Date Required",
        description: "Please schedule the next follow-up call.",
        variant: "destructive"
      });
      return;
    }

    const updates: Partial<Lead> & { id: string } = {
      id: lead.id,
      follow_up_status: 'pending', // Keep pending since we're scheduling next call
      last_contact: new Date().toISOString(),
      next_follow_up: new Date(markDoneNextCall).toISOString(),
    };

    // Add comment to notes
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] call_completed: ${markDoneComment.trim()}`;
    updates.notes = lead.notes ? `${lead.notes}\n\n${newNote}` : newNote;

    updateLead.mutate(updates, {
      onSuccess: () => {
        toast({ 
          title: "Call Logged", 
          description: "Notes saved and next follow-up scheduled." 
        });
        setMarkDoneDialogOpen(false);
        setMarkDoneComment("");
        setMarkDoneNextCall("");
      }
    });
  };

  const getInterestColor = (level: number) => {
    if (level <= 30) return "bg-red-500";
    if (level <= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Parse notes as history
  const parseHistory = (notes: string | null) => {
    if (!notes) return [];
    const lines = notes.split('\n\n');
    return lines.map((line, i) => {
      const match = line.match(/\[(.*?)\] (.*?): (.*)/);
      if (match) {
        return { id: i, timestamp: match[1], outcome: match[2], content: match[3] };
      }
      return { id: i, timestamp: new Date().toISOString(), outcome: "note", content: line };
    });
  };

  const history = parseHistory(lead.notes);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h2 className="text-2xl font-bold font-display">{lead.name}</h2>
            <Badge variant="outline">{getStatusDisplay(lead.status)}</Badge>
          </div>
          <p className="text-muted-foreground">{lead.business_name || "No business"}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">

          {/* Contact Info & Actions */}
          <div className="flex items-center space-x-4">
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => window.open(`tel:${lead.phone}`)}>
              <Phone className="w-4 h-4 mr-2" />
              Call {lead.phone || "No phone"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => window.open(`mailto:${lead.email || ''}?subject=Follow up`)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>

          {/* Priority Follow-up Alert - Overdue */}
          {lead.next_follow_up && new Date(lead.next_follow_up) <= new Date() && lead.follow_up_status === 'pending' && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-800">Follow-up Overdue</p>
                    <CountdownTimer targetDate={lead.next_follow_up} />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => setMarkDoneDialogOpen(true)}
                  disabled={updateLead.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Mark Done
                </Button>
              </div>
            </div>
          )}

          {/* Upcoming Follow-up Countdown */}
          {lead.next_follow_up && new Date(lead.next_follow_up) > new Date() && lead.follow_up_status === 'pending' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Next Follow-up</p>
                    <p className="text-xs text-blue-600 mb-1">
                      {format(new Date(lead.next_follow_up), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <CountdownTimer targetDate={lead.next_follow_up} />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => setMarkDoneDialogOpen(true)}
                  disabled={updateLead.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Mark Done
                </Button>
              </div>
            </div>
          )}

          {/* Priority Selector - Always visible */}
          <div className={cn(
            "p-3 rounded-lg flex items-center justify-between",
            lead.priority === 'urgent' && "bg-red-50 border border-red-200",
            lead.priority === 'high' && "bg-orange-50 border border-orange-200",
            lead.priority === 'normal' && "bg-gray-50 border border-gray-200",
            lead.priority === 'low' && "bg-slate-50 border border-slate-200"
          )}>
            <div className="flex items-center space-x-2">
              <Flag className={cn(
                "w-4 h-4",
                lead.priority === 'urgent' && "text-red-600",
                lead.priority === 'high' && "text-orange-600",
                lead.priority === 'normal' && "text-gray-500",
                lead.priority === 'low' && "text-slate-400"
              )} />
              <span className={cn(
                "text-sm font-medium",
                lead.priority === 'urgent' && "text-red-700",
                lead.priority === 'high' && "text-orange-700",
                lead.priority === 'normal' && "text-gray-700",
                lead.priority === 'low' && "text-slate-600"
              )}>
                {(lead.priority || 'normal').charAt(0).toUpperCase() + (lead.priority || 'normal').slice(1)} Priority
              </span>
            </div>
            <Select 
              value={lead.priority || 'normal'} 
              onValueChange={(val) => {
                updateLead.mutate({ id: lead.id, priority: val as Lead['priority'] });
              }}
            >
              <SelectTrigger className="w-[120px] h-8">
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

          {/* Interest Slider */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Interest Level</label>
              <span className={cn("text-sm font-bold px-2 py-0.5 rounded text-white", getInterestColor(interestLevel))}>
                {interestLevel}%
              </span>
            </div>
            <Slider
              value={[interestLevel]}
              max={100}
              step={5}
              onValueChange={(val) => setInterestLevel(val[0])}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">Slide to update lead warmth.</p>
          </div>

          {/* Log Call Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center">
              <Phone className="w-4 h-4 mr-2 text-primary" />
              Log Activity
            </h3>

            <div className="space-y-3">
              <Textarea
                placeholder="Call summary... (Required)"
                value={callSummary}
                onChange={(e) => setCallSummary(e.target.value)}
                className="resize-none h-24"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Outcome</label>
                  <Select value={callOutcome} onValueChange={setCallOutcome}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_response">No Response</SelectItem>
                      <SelectItem value="call_back">Call Back Later</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="border rounded-lg p-3 bg-gray-50/50">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Schedule Next Follow-up</label>
                <DateTimePicker 
                  value={nextFollowUpDate} 
                  onChange={setNextFollowUpDate}
                />
              </div>

              <Button onClick={handleSaveCall} className="w-full" disabled={updateLead.isPending}>
                {updateLead.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Save Activity
              </Button>
            </div>
          </div>

          <Separator />

          {/* History Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center">
              <History className="w-4 h-4 mr-2 text-primary" />
              History
            </h3>
            <div className="relative border-l border-gray-200 ml-2 space-y-6 pb-4">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-6">No history yet.</p>
              ) : (
                history.map((note) => (
                  <div key={note.id} className="relative pl-6">
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-gray-200 rounded-full border-2 border-white" />
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-0.5">
                        {format(new Date(note.timestamp), "MMM d, h:mm a")} • {note.outcome}
                      </span>
                      <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded-md border border-gray-100">
                        {note.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Action */}
      <div className="p-4 border-t bg-gray-50 space-y-3">
        <Button
          className="w-full bg-black text-white hover:bg-gray-800"
          onClick={handleConvertToClient}
          disabled={lead.status === "converted" || createClient.isPending}
        >
          {createClient.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Convert to Client
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {/* Delete Lead Button */}
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmText(""); }}>
          <Button 
            variant="outline" 
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Lead
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Lead</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete <span className="font-semibold">{lead.name}</span> and all associated data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  To confirm deletion, please type <span className="font-bold">CONFIRM</span> below:
                </p>
              </div>
              <Input 
                value={deleteConfirmText} 
                onChange={e => setDeleteConfirmText(e.target.value)} 
                placeholder="Type CONFIRM to delete"
                className="border-red-200 focus:border-red-400"
              />
              <Button 
                onClick={handleDeleteLead} 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteConfirmText !== "CONFIRM" || deleteLead.isPending}
              >
                {deleteLead.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete Lead Permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mark Call Done Dialog */}
      <Dialog open={markDoneDialogOpen} onOpenChange={(open) => { 
        setMarkDoneDialogOpen(open); 
        if (!open) { 
          setMarkDoneComment(""); 
          setMarkDoneNextCall(""); 
        } 
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Mark Call as Done
            </DialogTitle>
            <DialogDescription>
              Add details about your conversation with {lead.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Call Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Call Summary / Notes <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="What did you discuss? Any important points..."
                value={markDoneComment}
                onChange={(e) => setMarkDoneComment(e.target.value)}
                className="resize-none h-24"
                required
              />
            </div>

            {/* Next Call Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Schedule Next Call <span className="text-red-500">*</span>
              </label>
              <div className="border rounded-lg p-3 bg-gray-50/50">
                <DateTimePicker 
                  value={markDoneNextCall} 
                  onChange={setMarkDoneNextCall}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setMarkDoneDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleMarkCallDone} 
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={updateLead.isPending}
              >
                {updateLead.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Save & Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
