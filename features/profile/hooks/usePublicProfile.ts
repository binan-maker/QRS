import { useState, useEffect } from "react";
import { getPublicProfile, type PublicProfile } from "@/services/user-service";

export type { PublicProfile };

export function usePublicProfile(username: string) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    setProfile(null);

    getPublicProfile(username)
      .then((p) => {
        if (!p) setNotFound(true);
        else setProfile(p);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  return { profile, loading, notFound };
}
