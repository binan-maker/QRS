import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";

export function useAuthSession() {
  const { user, isLoading, token } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return db.get(["users", user.id]);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    profile: profileQuery.data ?? null,
    isProfileLoading: profileQuery.isLoading,
  };
}
