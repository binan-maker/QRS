import React, { createContext, useContext, useRef, useCallback } from "react";
import { Animated } from "react-native";

const THRESHOLD = 4;
export const TAB_BAR_HIDE_OFFSET = 100;

interface TabBarCtx {
  tabBarTranslateY: Animated.Value;
  onTabScroll: (e: any) => void;
  resetTabBar: () => void;
}

const TabBarContext = createContext<TabBarCtx | null>(null);

export function TabBarProvider({ children }: { children: React.ReactNode }) {
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const lastY             = useRef(0);
  const hidden            = useRef(false);

  const animTo = useCallback((val: number) => {
    Animated.spring(tabBarTranslateY, {
      toValue: val, useNativeDriver: true,
      tension: 110, friction: 16,
    }).start();
  }, [tabBarTranslateY]);

  const onTabScroll = useCallback((e: any) => {
    const y    = e.nativeEvent.contentOffset.y;
    const diff = y - lastY.current;
    lastY.current = y;
    if (Math.abs(diff) < THRESHOLD) return;
    if (diff > 0 && y > 50 && !hidden.current) {
      hidden.current = true;
      animTo(TAB_BAR_HIDE_OFFSET);
    } else if (diff < 0 && hidden.current) {
      hidden.current = false;
      animTo(0);
    }
  }, [animTo]);

  const resetTabBar = useCallback(() => {
    hidden.current = false;
    lastY.current  = 0;
    Animated.spring(tabBarTranslateY, {
      toValue: 0, useNativeDriver: true,
      tension: 110, friction: 16,
    }).start();
  }, [tabBarTranslateY]);

  return (
    <TabBarContext.Provider value={{ tabBarTranslateY, onTabScroll, resetTabBar }}>
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBarScroll(): TabBarCtx {
  const ctx = useContext(TabBarContext);
  if (!ctx) throw new Error("useTabBarScroll must be inside TabBarProvider");
  return ctx;
}
