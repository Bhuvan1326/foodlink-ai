import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Sparkles, Gift } from "lucide-react";

function predictWaste(expiryTime: Date, demandLevel: string) {
  const hoursLeft = (expiryTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft < 3 && demandLevel === "low") return { probability: "high", action: "donate" };
  if (hoursLeft < 3) return { probability: "high", action: "discount" };
  if (hoursLeft <= 6) return { probability: "medium", action: "discount" };
  return { probability: "low", action: "sell" };
}

const BADGE_COLORS: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-primary text-primary-foreground",
};

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [expiryHours, setExpiryHours] = useState("");
  const [demandLevel, setDemandLevel] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("food_items")
      .select("*")
      .eq("restaurant_id", user.id)
      .order("created_at", { ascending: false });
    setFoodItems(data || []);
  };

  useEffect(() => { fetchItems(); }, [user]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const expiryTime = new Date(Date.now() + parseFloat(expiryHours) * 60 * 60 * 1000);
    const prediction = predictWaste(expiryTime, demandLevel);

    const { error } = await supabase.from("food_items").insert({
      restaurant_id: user.id,
      food_name: foodName,
      quantity: parseFloat(quantity),
      quantity_unit: unit,
      expiry_time: expiryTime.toISOString(),
      demand_level: demandLevel,
      waste_probability: prediction.probability,
      suggested_action: prediction.action,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Food item added!", description: `Waste risk: ${prediction.probability}` });
      setFoodName(""); setQuantity(""); setExpiryHours("");

      // Auto-create donation for high waste risk items
      if (prediction.probability === "high") {
        // Get the newly inserted food item
        const { data: newItems } = await supabase
          .from("food_items")
          .select("*")
          .eq("restaurant_id", user.id)
          .eq("food_name", foodName)
          .order("created_at", { ascending: false })
          .limit(1);

        if (newItems && newItems.length > 0) {
          const newItem = newItems[0];

          // Create donation
          const { data: donationData, error: donationError } = await supabase
            .from("donations")
            .insert({
              food_item_id: newItem.id,
              restaurant_id: user.id,
              pickup_time: expiryTime.toISOString(),
              status: "available",
            })
            .select("id")
            .single();

          if (!donationError && donationData) {
            // Mark food item as donated
            await supabase.from("food_items").update({ status: "donated" }).eq("id", newItem.id);

            // Find nearest NGO and create delivery mission
            const { data: profile } = await supabase.from("profiles").select("simulated_location").eq("user_id", user.id).maybeSingle();
            const { data: ngos } = await supabase.from("user_roles").select("user_id").eq("role", "ngo").limit(1);

            if (ngos && ngos.length > 0) {
              const ngoId = ngos[0].user_id;
              const { data: ngoProfile } = await supabase.from("profiles").select("simulated_location").eq("user_id", ngoId).maybeSingle();

              // Update donation with matched NGO
              await supabase.from("donations").update({ ngo_id: ngoId, status: "matched" }).eq("id", donationData.id);

              // Create delivery mission
              await supabase.from("delivery_missions").insert({
                donation_id: donationData.id,
                restaurant_location: profile?.simulated_location || "Downtown",
                ngo_location: ngoProfile?.simulated_location || "Midtown",
                food_details: `${newItem.food_name} - ${newItem.quantity}${newItem.quantity_unit}`,
                  status: "pending",
              });

              toast({ title: "Auto-matched!", description: "High-risk item donated, NGO matched, and delivery mission created!" });
            }
          }
        }
      }

      fetchItems();
    }
    setLoading(false);
  };

  const handleGetAISuggestion = async (itemId: string) => {
    setAiLoading(itemId);
    try {
      const item = foodItems.find((i) => i.id === itemId);
      if (!item) return;
      const { data, error } = await supabase.functions.invoke("ai-predict", {
        body: { foodName: item.food_name, quantity: item.quantity, unit: item.quantity_unit, hoursLeft: ((new Date(item.expiry_time).getTime() - Date.now()) / 3600000).toFixed(1), demandLevel: item.demand_level, wasteRisk: item.waste_probability },
      });
      if (error) throw error;
      await supabase.from("food_items").update({ ai_suggestion: data.suggestion }).eq("id", itemId);
      fetchItems();
      toast({ title: "AI suggestion ready!" });
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message, variant: "destructive" });
    }
    setAiLoading(null);
  };

  const handleCreateDonation = async (itemId: string) => {
    if (!user) return;
    const item = foodItems.find((i) => i.id === itemId);
    if (!item) return;

    const { error } = await supabase.from("donations").insert({
      food_item_id: itemId,
      restaurant_id: user.id,
      pickup_time: item.expiry_time,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("food_items").update({ status: "donated" }).eq("id", itemId);

      // Always create delivery mission for donated items
      const { data: profile } = await supabase.from("profiles").select("simulated_location").eq("user_id", user.id).maybeSingle();
      const { data: ngos } = await supabase.from("user_roles").select("user_id").eq("role", "ngo").limit(1);
      if (ngos && ngos.length > 0) {
        const ngoId = ngos[0].user_id;
        const { data: ngoProfile } = await supabase.from("profiles").select("simulated_location").eq("user_id", ngoId).maybeSingle();
        const { data: donation } = await supabase.from("donations").select("id").eq("food_item_id", itemId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (donation) {
          await supabase.from("donations").update({ ngo_id: ngoId, status: "matched" }).eq("id", donation.id);
          await supabase.from("delivery_missions").insert({
            donation_id: donation.id,
            restaurant_location: profile?.simulated_location || "Downtown",
            ngo_location: ngoProfile?.simulated_location || "Midtown",
            food_details: `${item.food_name} - ${item.quantity}${item.quantity_unit}`,
            status: "pending",
          });
          toast({ title: "Auto-matched!", description: "Donation matched with nearest NGO. Mission created!" });
        }
      }

      toast({ title: "Donation created!" });
      fetchItems();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Restaurant Dashboard</h1>
        <p className="text-muted-foreground">Add food items and get AI-powered waste predictions</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Plus className="h-5 w-5 text-role-icon" /> Add Food Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddItem} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Food Name</Label>
              <Input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="e.g. Rice, Bread" required />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex gap-2">
                <Input type="number" step="0.1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Amount" required />
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded-md border border-input bg-background px-3 text-sm">
                  <option value="kg">kg</option>
                  <option value="meals">meals</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hours Until Expiry</Label>
              <Input type="number" step="0.5" min="0.5" value={expiryHours} onChange={(e) => setExpiryHours(e.target.value)} placeholder="e.g. 4" required />
            </div>
            <div className="space-y-2">
              <Label>Demand Level</Label>
              <select value={demandLevel} onChange={(e) => setDemandLevel(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Adding..." : "Add Food Item"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Your Food Items</h2>
        {foodItems.length === 0 ? (
          <Card className="shadow-card"><CardContent className="py-8 text-center text-muted-foreground">No food items yet. Add one above!</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {foodItems.map((item) => (
              <Card key={item.id} className="shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base text-foreground">{item.food_name}</CardTitle>
                    <Badge className={BADGE_COLORS[item.waste_probability] || ""}>{item.waste_probability} risk</Badge>
                  </div>
                  <CardDescription>{item.quantity} {item.quantity_unit} · {item.demand_level} demand</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Suggested: </span>
                    <span className="font-medium capitalize text-foreground">{item.suggested_action}</span>
                  </div>
                  {item.ai_suggestion && (
                    <div className="rounded-md bg-role-secondary p-2 text-sm text-foreground">
                      <Sparkles className="mb-1 inline h-3 w-3 text-role-icon" /> {item.ai_suggestion}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleGetAISuggestion(item.id)} disabled={aiLoading === item.id}>
                      <Sparkles className="mr-1 h-3 w-3" /> {aiLoading === item.id ? "Thinking..." : "AI Suggest"}
                    </Button>
                    {item.status === "active" && (
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleCreateDonation(item.id)}>
                        <Gift className="mr-1 h-3 w-3" /> Donate
                      </Button>
                    )}
                    {item.status === "donated" && (
                      <Badge variant="secondary">Donated</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
