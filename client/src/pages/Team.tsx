import { useStore } from "@/lib/store";
import Shell from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, Mail, BadgeCheck, Settings } from "lucide-react";

export default function Team() {
  const { users } = useStore();

  return (
    <Shell>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-display tracking-tight">Team</h1>
        <Button variant="outline">
          <Mail className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
            <div className="h-2 bg-primary/80" />
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
               <Avatar className="h-12 w-12 mr-4">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                  <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
               </Avatar>
               <div>
                 <CardTitle className="text-lg">{user.name}</CardTitle>
                 <div className="flex items-center text-xs text-muted-foreground">
                   <BadgeCheck className="w-3 h-3 mr-1 text-primary" />
                   {user.role}
                 </div>
               </div>
            </CardHeader>
            <CardContent>
               <div className="mt-4 space-y-4">
                 <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Daily Calls</span>
                     <span className="font-medium">{user.callsCompletedToday || 0} / {user.dailyCallTarget}</span>
                   </div>
                   <Progress value={((user.callsCompletedToday || 0) / (user.dailyCallTarget || 1)) * 100} className="h-2" />
                 </div>

                 <div className="pt-4 border-t flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {/* Placeholder for status indicators or stats */}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Settings className="w-4 h-4 text-gray-400" />
                    </Button>
                 </div>

                 {/* Admin Action: Set Target */}
                 <div className="bg-gray-50 p-3 rounded-md">
                   <label className="text-xs text-muted-foreground block mb-1">Set Daily Target</label>
                   <div className="flex space-x-2">
                     <Input 
                       type="number" 
                       defaultValue={user.dailyCallTarget} 
                       className="h-8 bg-white"
                     />
                     <Button size="sm" variant="outline" className="h-8">Update</Button>
                   </div>
                 </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
