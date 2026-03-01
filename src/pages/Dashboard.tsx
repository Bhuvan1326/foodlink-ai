import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import RestaurantDashboard from "./RestaurantDashboard";
import NGODashboard from "./NGODashboard";
import VolunteerDashboard from "./VolunteerDashboard";

export default function Dashboard() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!role) return (
    <DashboardLayout>
      <div className="text-center py-12 text-muted-foreground">Setting up your account...</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      {role === "restaurant" && <RestaurantDashboard />}
      {role === "ngo" && <NGODashboard />}
      {role === "volunteer" && <VolunteerDashboard />}
    </DashboardLayout>
  );
}
