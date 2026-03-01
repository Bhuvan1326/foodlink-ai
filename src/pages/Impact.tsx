import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import ImpactDashboard from "./ImpactDashboard";

export default function Impact() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <DashboardLayout>
      <ImpactDashboard />
    </DashboardLayout>
  );
}
