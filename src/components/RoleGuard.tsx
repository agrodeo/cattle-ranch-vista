import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { currentUser } = useSupabaseAuth();

  if (!currentUser?.role) return <>{fallback}</>;

  const effectiveRole =
    currentUser.role === "admin" ? "owner" : currentUser.role === "employee" ? "worker" : currentUser.role;

  if (!allowedRoles.includes(effectiveRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
