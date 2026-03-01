import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { MapPin, Truck, CheckCircle, Bell } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning text-warning-foreground",
  accepted: "bg-info text-primary-foreground",
  delivered: "bg-primary text-primary-foreground",
};

const FIVE_MINUTES = 5 * 60 * 1000;

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<any[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [showBanner, setShowBanner] = useState(false);

  const fetchMissions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("delivery_missions")
      .select("*")
      .or(`status.eq.pending,and(status.eq.accepted,volunteer_id.eq.${user.id})`)
      .order("created_at", { ascending: false });
    setMissions(data || []);
  };

  useEffect(() => {
    if (user) fetchMissions();

    const channel = supabase
      .channel("volunteer-missions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_missions" },
        (payload) => {
          toast({ title: "🔔 New food pickup available nearby." });
          setNewIds((prev) => new Set(prev).add(payload.new.id));
          setShowBanner(true);
          fetchMissions();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const isNew = (mission: any) =>
    newIds.has(mission.id) ||
    Date.now() - new Date(mission.created_at).getTime() < FIVE_MINUTES;

  const handleAccept = async (missionId: string) => {
    if (!user) return;
    const { error } = await supabase.from("delivery_missions").update({
      volunteer_id: user.id,
      status: "accepted",
    }).eq("id", missionId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mission accepted!" });
      setNewIds((prev) => { const s = new Set(prev); s.delete(missionId); return s; });
      fetchMissions();
    }
  };

  const handleDeliver = async (missionId: string, donationId: string) => {
    const { error } = await supabase.from("delivery_missions").update({
      status: "delivered",
      completed_at: new Date().toISOString(),
    }).eq("id", missionId);

    if (!error) {
      await supabase.from("donations").update({ status: "completed" }).eq("id", donationId);

      const { data: stats } = await supabase.from("impact_stats").select("*").limit(1).maybeSingle();
      if (stats) {
        await supabase.from("impact_stats").update({
          total_meals_saved: stats.total_meals_saved + 1,
          total_food_rescued_kg: stats.total_food_rescued_kg + 2.5,
          estimated_co2_reduced_kg: stats.estimated_co2_reduced_kg + 4.5,
          updated_at: new Date().toISOString(),
        }).eq("id", stats.id);
      }

      toast({ title: "Delivered! 🎉", description: "Impact stats updated." });
      fetchMissions();
    }
  };

  const pendingCount = missions.filter((m) => m.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Volunteer Dashboard</h1>
        <p className="text-muted-foreground">Accept and complete delivery missions</p>
      </div>

      {(showBanner || pendingCount > 0) && (
        <Card className="border-role bg-role-secondary shadow-card">
          <CardContent className="flex items-center gap-3 py-3">
            <Bell className="h-5 w-5 text-role-icon animate-bounce" />
            <span className="font-medium text-foreground">
              {pendingCount} New Delivery Mission{pendingCount !== 1 ? "s" : ""} Available!
            </span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setShowBanner(false)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {missions.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-8 text-center text-muted-foreground">No delivery missions yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {missions.map((m) => (
            <Card key={m.id} className={`shadow-card hover:shadow-card-hover transition-shadow ${isNew(m) ? "ring-2 ring-role" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base text-foreground">{m.food_details}</CardTitle>
                    {isNew(m) && (
                      <Badge className="bg-role text-role-foreground animate-pulse">
                        <Bell className="mr-1 h-3 w-3" /> New
                      </Badge>
                    )}
                  </div>
                  <Badge className={STATUS_COLORS[m.status] || ""}>{m.status}</Badge>
                </div>
                <CardDescription>Mission #{m.id.slice(0, 8)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-role-icon" />
                  From: {m.restaurant_location}
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-destructive" />
                  To: {m.ngo_location}
                </div>
                <div className="flex gap-2 pt-2">
                  {m.status === "pending" && (
                    <Button size="sm" className="w-full bg-role text-role-foreground hover:bg-role/90" onClick={() => handleAccept(m.id)}>
                      <Truck className="mr-1 h-3 w-3" /> Accept Mission
                    </Button>
                  )}
                  {m.status === "accepted" && m.volunteer_id === user?.id && (
                    <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleDeliver(m.id, m.donation_id)}>
                      <CheckCircle className="mr-1 h-3 w-3" /> Mark Delivered
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
