import { useState, useEffect, useCallback } from "react";
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
      const state = await Network.getNetworkStateAsync();
      // isInternetReachable can be null on web/Replit — null means "can't tell", not "offline".
      // Only treat as offline when explicitly false.
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    } catch {
      setIsOnline(true);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [check]);

  return { isOnline, isChecking, recheck: check };
}
