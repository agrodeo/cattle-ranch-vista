import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, DollarSign, TrendingUp } from "lucide-react";

const Dashboard = () => {
  // Mock data for now - will be replaced with real data from Supabase
  const stats = [
    {
      title: "Total Animals",
      value: "0",
      icon: Users,
      description: "Active cattle in the system",
      trend: "+0%",
    },
    {
      title: "Recent Activities",
      value: "0",
      icon: Activity,
      description: "Activities logged this week",
      trend: "+0%",
    },
    {
      title: "Monthly Revenue",
      value: "$0",
      icon: DollarSign,
      description: "Income this month",
      trend: "+0%",
    },
    {
      title: "Services",
      value: "0",
      icon: TrendingUp,
      description: "Breeding services completed",
      trend: "+0%",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Badge variant="outline">Welcome to AgroDeo</Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No recent activities found.
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Get started by:
            </div>
            <ul className="space-y-2 text-sm">
              <li>• Add your first animal</li>
              <li>• Log an activity</li>
              <li>• Record a service</li>
              <li>• Track finances</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;