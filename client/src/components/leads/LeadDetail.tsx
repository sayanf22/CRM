import { useState, useEffect } from "react";
import { useStore, Lead } from "@/lib/store";
import { format } from "date-fns";
import { 
  Phone, 
  MessageSquare, 
  Calendar, 
  User, 
  History,
  CheckCircle2,
  X,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LeadDetailProps {
  leadId: string;
  onClose: () => void;
}

export default function LeadDetail({ leadId, onClose }: LeadDetailProps) {
  const { leads, updateLead, addHistoryToLead, convertToClient } = useStore();
  const lead = leads.find(l => l.id === leadId);
  const { toast } = useToast();

  if (!lead) return null;

  // Local state for the "Log Call" form
  const [callSummary, setCallSummary] = useState("");
  const [callOutcome, setCallOutcome] = useState("call_back"); // no_response, call_back, interested, not_interested
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [interestLevel, setInterestLevel] = useState(lead.interestLevel);

  // Sync slider when lead changes
  useEffect(() => {
    setInterestLevel(lead.interestLevel);
  }, [lead.id]);

  const handleSaveCall = () => {
    if (!callSummary) {
      toast({
        title: "Summary Required",
        description: "Please write a summary of the call.",
        variant: "destructive"
      });
      return;
    }

    // 1. Add History
    addHistoryToLead(lead.id, {
      content: `Call Outcome: ${callOutcome.replace('_', ' ')}. ${callSummary}`,
      type: "call_summary"
    });

    // 2. Update Lead
    const updates: Partial<Lead> = {
      lastContact: new Date().toISOString(),
      interestLevel: interestLevel, // Save the slider value
    };

    if (callOutcome === 'not_interested') {
      updates.status = "Not Interested";
      updates.nextFollowUp = null;
    } else if (callOutcome === 'interested') {
      updates.status = "Interested";
    }

    if (nextFollowUpDate) {
      updates.nextFollowUp = new Date(nextFollowUpDate).toISOString();
    }

    updateLead(lead.id, updates);

    toast({ title: "Call Logged", description: "Lead updated successfully." });
    
    // Reset form
    setCallSummary("");
    setCallOutcome("call_back");
    setNextFollowUpDate("");
  };

  const handleConvertToClient = () => {
    if (confirm("Are you sure you want to convert this lead to a client?")) {
      convertToClient(lead.id, {
        businessName: lead.businessName,
        ownerName: lead.name,
        phone: lead.phone,
        address: "Pending Address",
        services: [],
        startDate: new Date().toISOString(),
        deliveryDate: null,
        status: "Onboarding"
      });
      toast({ title: "Converted!", description: `${lead.name} is now a client.` });
      onClose();
    }
  };

  const getInterestColor = (level: number) => {
    if (level <= 30) return "bg-red-500";
    if (level <= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2 mb-1">
             <h2 className="text-2xl font-bold font-display">{lead.name}</h2>
             <Badge variant="outline">{lead.status}</Badge>
          </div>
          <p className="text-muted-foreground">{lead.businessName}</p>
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
               Call {lead.phone}
             </Button>
             <Button variant="outline" className="flex-1" onClick={() => window.open(`mailto:?subject=Follow up`)}>
               <MessageSquare className="w-4 h-4 mr-2" />
               Email
             </Button>
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
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Next Follow-up</label>
                  <input 
                    type="datetime-local" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleSaveCall} className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-2" />
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
              {lead.history.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-6">No history yet.</p>
              ) : (
                lead.history.map((note) => (
                  <div key={note.id} className="relative pl-6">
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-gray-200 rounded-full border-2 border-white" />
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-0.5">
                        {format(new Date(note.timestamp), "MMM d, h:mm a")} • Agent
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
      <div className="p-4 border-t bg-gray-50">
        <Button 
          className="w-full bg-black text-white hover:bg-gray-800" 
          onClick={handleConvertToClient}
          disabled={lead.status === "Converted"}
        >
          Convert to Client
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
