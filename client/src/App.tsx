import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Clients from "@/pages/Clients";
import Tasks from "@/pages/Tasks";
import Team from "@/pages/Team";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/leads" component={Leads} />
      <Route path="/clients" component={Clients} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/team" component={Team} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
