import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as Network from "expo-network";

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
        const state = await Network.getNetworkStateAsync();
        setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
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
      const interval = setInterval(check, 15000);
      return () => clearInterval(interval);
    }
  }, [check]);

  return { isOnline, isChecking, recheck: check };
}
