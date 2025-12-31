import Shell from "@/components/layout/Shell";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Phone, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { currentUser, leads, tasks } = useStore();

  // Calculate Stats
  const assignedLeads = leads.filter(l => l.assignedTo === currentUser.id);
  const pendingFollowUps = assignedLeads.filter(l => l.nextFollowUp && new Date(l.nextFollowUp) <= new Date());
  
  const myTasks = tasks.filter(t => t.assignedTo === currentUser.id && t.status !== "Completed");
  
  const dailyTarget = currentUser.dailyCallTarget || 20;
  const callsDone = currentUser.callsCompletedToday || 0;
  const progress = (callsDone / dailyTarget) * 100;

  return (
    <Shell>
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900">
          Good morning, {currentUser.name.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground mt-1">Here is what's on your plate today.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Daily Call Goal */}
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">
              Daily Calls
            </CardTitle>
            <Phone className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{callsDone} / {dailyTarget}</div>
            <Progress value={progress} className="h-2 mt-3 bg-blue-100" indicatorClassName="bg-blue-600" />
            <p className="text-xs text-blue-700 mt-2">
              {progress >= 100 ? "Goal reached! 🎉" : `${dailyTarget - callsDone} more to go`}
            </p>
          </CardContent>
        </Card>

        {/* Pending Follow-ups */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Follow-ups
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingFollowUps.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Calls scheduled for today
            </p>
          </CardContent>
        </Card>

        {/* Active Tasks */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Tasks
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              To-do items pending
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Quick Actions / Priority List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold font-display">Priority Follow-ups</h2>
            <Link href="/leads">
              <a className="text-sm text-primary font-medium hover:underline flex items-center">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </Link>
          </div>
          
          <div className="space-y-3">
            {pendingFollowUps.length === 0 ? (
               <div className="p-8 text-center border rounded-lg border-dashed text-muted-foreground bg-gray-50">
                 No pending follow-ups for today. Good job!
               </div>
            ) : (
              pendingFollowUps.slice(0, 3).map(lead => (
                <div key={lead.id} className="group flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-primary/20 hover:shadow-md transition-all cursor-pointer">
                  <div>
                    <h3 className="font-medium text-gray-900">{lead.name}</h3>
                    <p className="text-sm text-gray-500">{lead.businessName}</p>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full mr-3">
                      Due Today
                    </span>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Tasks */}
        <section>
           <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold font-display">My Tasks</h2>
            <Link href="/tasks">
              <a className="text-sm text-primary font-medium hover:underline flex items-center">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </Link>
          </div>

          <div className="space-y-3">
             {myTasks.length === 0 ? (
               <div className="p-8 text-center border rounded-lg border-dashed text-muted-foreground bg-gray-50">
                 You're all caught up!
               </div>
            ) : (
              myTasks.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${task.status === 'Pending' ? 'bg-yellow-400' : 'bg-blue-500'}`} />
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{task.title}</h3>
                      <p className="text-xs text-gray-500">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                   <button className="text-xs border px-2 py-1 rounded hover:bg-gray-50">
                    Mark Done
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}
