import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
  recheck: () => void;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const check = useCallback(async () => {
    setIsChecking(true);
    try {
      if (Platform.OS === "web") {
        setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
      } else {
        const state = await NetInfo.fetch();
        // Only trust isConnected. isInternetReachable is unreliable across
        // different networks (VPNs, firewalls, cellular) and frequently
        // returns false/null even when internet is fully working.
        setIsOnline(state.isConnected !== false);
      }
    } catch {
      setIsOnline(true);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    check();

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    } else {
      // NetInfo provides real-time connectivity events on iOS and Android,
      // no need to poll with setInterval.
      const unsubscribe = NetInfo.addEventListener((state) => {
        setIsOnline(state.isConnected !== false);
      });
      return () => unsubscribe();
    }
  }, [check]);

  return { isOnline, isChecking, recheck: check };
}
