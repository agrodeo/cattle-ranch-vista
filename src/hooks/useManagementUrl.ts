import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useManagementUrl() {
  const { data: managementUrl } = useQuery({
    queryKey: ["paddle-management-url"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("cabaña_id" as any)
        .eq("user_id", user.id)
        .maybeSingle();

      const cabanaId = (profile as any)?.cabaña_id;
      if (!cabanaId) return null;

      const { data: sub } = await supabase
        .from("billing_subscriptions")
        .select("management_url" as any)
        .eq("cabana_id", cabanaId)
        .eq("provider", "paddle")
        .eq("status", "active")
        .maybeSingle();

      return (sub as any)?.management_url ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { managementUrl: managementUrl ?? null };
}
