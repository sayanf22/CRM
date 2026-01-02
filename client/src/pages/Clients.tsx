import { useState } from "react";
import { useClients, Client } from "@/hooks/use-clients";
import { format } from "date-fns";
import {
  Building2,
  Search,
  Filter,
  ChevronRight,
  Briefcase,
  Loader2
} from "lucide-react";
import Shell from "@/components/layout/Shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import ClientDetail from "@/components/clients/ClientDetail";
import { cn } from "@/lib/utils";

export default function Clients() {
  const { data: clients = [], isLoading } = useClients();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredClients = clients.filter(client =>
    client.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClientClick = (client: Client) => {
    setSelectedClientId(client.id);
    setIsDetailOpen(true);
  };

  const getStatusDisplay = (status: Client["status"]) => {
    const map: Record<string, string> = {
      onboarding: "Onboarding",
      in_progress: "In Progress",
      waiting_on_client: "Waiting on Client",
      delivered: "Delivered",
      closed: "Closed"
    };
    return map[status] || status;
  };

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case "onboarding": return "bg-blue-100 text-blue-700";
      case "in_progress": return "bg-indigo-100 text-indigo-700";
      case "waiting_on_client": return "bg-yellow-100 text-yellow-700";
      case "delivered": return "bg-green-100 text-green-700";
      case "closed": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
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
          <h1 className="text-3xl font-bold font-display tracking-tight">Clients</h1>
        </div>

        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
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
        {filteredClients.map((client) => (
          <div
            key={client.id}
            onClick={() => handleClientClick(client)}
            className="group relative bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-lg text-gray-900">{client.business_name}</h3>
                  <Badge variant="secondary" className={cn("text-xs font-normal", getStatusColor(client.status))}>
                    {getStatusDisplay(client.status)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{client.owner_name}</p>

                <div className="flex items-center mt-3 text-xs text-muted-foreground space-x-4">
                  <span className="flex items-center">
                    <Building2 className="w-3 h-3 mr-1" />
                    Started: {format(new Date(client.start_date), "MMM d, yyyy")}
                  </span>
                  {client.delivery_date && (
                    <span className="flex items-center">
                      <Briefcase className="w-3 h-3 mr-1" />
                      Due: {format(new Date(client.delivery_date), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          </div>
        ))}

        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm ? `No clients found matching "${searchTerm}"` : "No clients yet."}
          </div>
        )}
      </div>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 overflow-y-auto">
          {selectedClientId && (
            <ClientDetail
              clientId={selectedClientId}
              onClose={() => setIsDetailOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </Shell>
  );
}
