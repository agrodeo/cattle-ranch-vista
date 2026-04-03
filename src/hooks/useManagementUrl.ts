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
        .select("cabaña_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.cabaña_id) return null;

      const { data: sub } = await supabase
        .from("billing_subscriptions")
        .select("management_url")
        .eq("cabana_id", profile.cabaña_id)
        .eq("provider", "paddle")
        .eq("status", "active")
        .maybeSingle();

      return (sub as any)?.management_url ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { managementUrl: managementUrl ?? null };
}
