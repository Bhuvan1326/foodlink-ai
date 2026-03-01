import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, UtensilsCrossed, HandHeart, Truck, BarChart3 } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg text-foreground">FoodLink AI</span>
          </div>
          <Link to="/auth">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="container py-20 text-center">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Leaf className="h-4 w-4" /> AI-Powered Food Waste Reduction
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Predict Food Waste.<br />
              <span className="text-primary">Feed Communities.</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              FoodLink AI connects restaurants with NGOs and volunteers to reduce food waste
              using smart predictions and automatic matching.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/auth"><Button size="lg">Start Saving Food</Button></Link>
              <Link to="/auth"><Button size="lg" variant="outline">Learn More</Button></Link>
            </div>
          </div>
        </section>

        <section className="container pb-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <UtensilsCrossed className="h-6 w-6" />, title: "Restaurants", desc: "List surplus food and get AI waste predictions" },
              { icon: <HandHeart className="h-6 w-6" />, title: "NGOs", desc: "Find and request food pickups nearby" },
              { icon: <Truck className="h-6 w-6" />, title: "Volunteers", desc: "Deliver food from restaurants to NGOs" },
              { icon: <BarChart3 className="h-6 w-6" />, title: "Impact", desc: "Track meals saved and CO₂ reduced" },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6 text-center space-y-3 shadow-card hover:shadow-card-hover transition-shadow">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">{f.icon}</div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
