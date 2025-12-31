import { useState } from "react";
import { useStore, Lead } from "@/lib/store";
import { format } from "date-fns";
import { 
  Phone, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Clock, 
  ChevronRight,
  Plus
} from "lucide-react";
import Shell from "@/components/layout/Shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import LeadDetail from "@/components/leads/LeadDetail";
import { cn } from "@/lib/utils";

export default function Leads() {
  const { leads, addLead } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInterestColor = (level: number) => {
    if (level <= 30) return "bg-red-500";
    if (level <= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsDetailOpen(true);
  };

  return (
    <Shell>
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-display tracking-tight">Leads</h1>
          <Button onClick={() => {
             // Quick mock add for demo
             const name = prompt("Enter Lead Name");
             if (name) addLead({
               name, 
               businessName: "New Business", 
               phone: "555-0000", 
               assignedTo: "u1", 
               status: "Not Sure", 
               interestLevel: 50, 
               lastContact: new Date().toISOString(), 
               nextFollowUp: null 
             });
          }} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>

        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search leads..." 
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="bg-white">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredLeads.map((lead) => (
          <div 
            key={lead.id}
            onClick={() => handleLeadClick(lead)}
            className="group relative bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-lg text-gray-900">{lead.name}</h3>
                  <Badge variant="secondary" className={cn(
                    "text-xs font-normal",
                    lead.status === "Interested" && "bg-green-100 text-green-700",
                    lead.status === "Not Interested" && "bg-red-100 text-red-700",
                    lead.status === "Not Sure" && "bg-yellow-100 text-yellow-700",
                  )}>
                    {lead.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{lead.businessName}</p>
                
                <div className="flex items-center mt-3 text-xs text-muted-foreground space-x-4">
                  <span className="flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {lead.phone}
                  </span>
                  {lead.nextFollowUp && (
                     <span className={cn(
                       "flex items-center",
                       new Date(lead.nextFollowUp) <= new Date() ? "text-orange-600 font-medium" : ""
                     )}>
                      <Clock className="w-3 h-3 mr-1" />
                      {format(new Date(lead.nextFollowUp), "MMM d, h:mm a")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end space-y-2">
                 <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                   <div 
                     className={cn("h-full transition-all duration-500", getInterestColor(lead.interestLevel))} 
                     style={{ width: `${lead.interestLevel}%` }}
                   />
                 </div>
                 <span className="text-xs text-gray-400 font-medium">{lead.interestLevel}% Interest</span>
              </div>
            </div>
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          </div>
        ))}

        {filteredLeads.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No leads found matching "{searchTerm}"
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
    </Shell>
  );
}
