import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function AccountManagementRoute() {
  const router = useRouter();

  useEffect(() => {
    router.replace({
      pathname: "/(tabs)/settings" as any,
      params: { initialSection: "account" },
    });
  }, [router]);

  return null;
}
