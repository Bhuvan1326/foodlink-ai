import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Leaf, Utensils, Scale, Wind } from "lucide-react";

export default function ImpactDashboard() {
  const [stats, setStats] = useState({ total_meals_saved: 0, total_food_rescued_kg: 0, estimated_co2_reduced_kg: 0 });

  useEffect(() => {
    supabase.from("impact_stats").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) setStats(data);
    });
  }, []);

  const chartData = [
    { name: "Meals Saved", value: stats.total_meals_saved },
    { name: "Food (kg)", value: stats.total_food_rescued_kg },
    { name: "CO₂ Reduced (kg)", value: stats.estimated_co2_reduced_kg },
  ];

  const statCards = [
    { label: "Meals Saved", value: stats.total_meals_saved, icon: <Utensils className="h-5 w-5" />, color: "text-primary" },
    { label: "Food Rescued", value: `${stats.total_food_rescued_kg} kg`, icon: <Scale className="h-5 w-5" />, color: "text-warning" },
    { label: "CO₂ Reduced", value: `${stats.estimated_co2_reduced_kg} kg`, icon: <Wind className="h-5 w-5" />, color: "text-info" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
          <Leaf className="h-6 w-6 text-primary" /> Impact Dashboard
        </h1>
        <p className="text-muted-foreground">See the collective impact of FoodLink AI</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <span className={s.color}>{s.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground">Impact Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 45%)" }} />
              <YAxis tick={{ fill: "hsl(215, 15%, 45%)" }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(160, 59%, 40%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
