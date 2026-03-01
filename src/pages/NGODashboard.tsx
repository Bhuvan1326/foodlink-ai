import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { MapPin, Clock, Package, Bell } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-primary text-primary-foreground",
  matched: "bg-info text-primary-foreground",
  in_delivery: "bg-warning text-warning-foreground",
  completed: "bg-muted text-muted-foreground",
};

const FIVE_MINUTES = 5 * 60 * 1000;

export default function NGODashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const fetchDonations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("donations")
      .select(`*, food_items(*)`)
      .or(`status.eq.available,ngo_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    // Fetch restaurant profiles separately since there's no FK
    if (data && data.length > 0) {
      const restaurantIds = [...new Set(data.map((d) => d.restaurant_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, organization_name, simulated_location")
        .in("user_id", restaurantIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      const enriched = data.map((d) => ({
        ...d,
        profiles: profileMap.get(d.restaurant_id) || null,
      }));
      setDonations(enriched);
    } else {
      setDonations(data || []);
    }
  };

  useEffect(() => {
    if (user) fetchDonations();

    const channel = supabase
      .channel("ngo-donations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "donations" },
        (payload) => {
          toast({ title: "🔔 New food pickup available nearby." });
          setNewIds((prev) => new Set(prev).add(payload.new.id));
          fetchDonations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Mark donations created within last 5 minutes as "new"
  const isNew = (donation: any) =>
    newIds.has(donation.id) ||
    Date.now() - new Date(donation.created_at).getTime() < FIVE_MINUTES;

  const handleRequestPickup = async (donationId: string) => {
    if (!user) return;
    const donation = donations.find((d) => d.id === donationId);
    if (!donation) return;

    const { error } = await supabase.from("donations").update({
      ngo_id: user.id,
      status: "matched",
    }).eq("id", donationId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Create delivery mission for volunteers
      const { data: restaurantProfile } = await supabase
        .from("profiles")
        .select("simulated_location")
        .eq("user_id", donation.restaurant_id)
        .maybeSingle();

      const { data: ngoProfile } = await supabase
        .from("profiles")
        .select("simulated_location")
        .eq("user_id", user.id)
        .maybeSingle();

      await supabase.from("delivery_missions").insert({
        donation_id: donationId,
        restaurant_location: restaurantProfile?.simulated_location || "Downtown",
        ngo_location: ngoProfile?.simulated_location || "Midtown",
        food_details: `${donation.food_items?.food_name || "Food"} - ${donation.food_items?.quantity || 0}${donation.food_items?.quantity_unit || "kg"}`,
        status: "pending",
      });

      toast({ title: "Pickup requested!", description: "A delivery mission has been created for volunteers." });
      setNewIds((prev) => { const s = new Set(prev); s.delete(donationId); return s; });
      fetchDonations();
    }
  };

  const getSimulatedDistance = () => `${(Math.random() * 5 + 0.5).toFixed(1)} km`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">NGO Dashboard</h1>
        <p className="text-muted-foreground">Browse available food donations and request pickups</p>
      </div>

      {donations.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-8 text-center text-muted-foreground">No donations available yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {donations.map((d) => (
            <Card key={d.id} className={`shadow-card hover:shadow-card-hover transition-shadow ${isNew(d) ? "ring-2 ring-primary" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base text-foreground">{d.food_items?.food_name || "Food Item"}</CardTitle>
                    {isNew(d) && (
                      <Badge className="bg-primary text-primary-foreground animate-pulse">
                        <Bell className="mr-1 h-3 w-3" /> New
                      </Badge>
                    )}
                  </div>
                  <Badge className={STATUS_COLORS[d.status] || ""}>{d.status.replace("_", " ")}</Badge>
                </div>
                <CardDescription>{d.profiles?.organization_name || d.profiles?.name || "Restaurant"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Package className="h-3.5 w-3.5 text-role-icon" />
                  {d.food_items?.quantity} {d.food_items?.quantity_unit}
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock className="h-3.5 w-3.5 text-role-icon" />
                  Pickup by: {d.pickup_time ? new Date(d.pickup_time).toLocaleTimeString() : "N/A"}
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-role-icon" />
                  {getSimulatedDistance()} away · {d.profiles?.simulated_location || "Downtown"}
                </div>
                {d.status === "available" && (
                  <Button size="sm" className="mt-2 w-full bg-role text-role-foreground hover:bg-role/90" onClick={() => handleRequestPickup(d.id)}>
                    Request Pickup
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
