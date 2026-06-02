import React, { createContext, useContext, useRef, useCallback } from "react";
import { Animated, Easing } from "react-native";

const THRESHOLD    = 8;
const HIDE_DURATION = 280;
const SHOW_DURATION = 340;

interface TabBarCtx {
  tabBarTranslateY: Animated.Value;
  onTabScroll: (e: any) => void;
  resetTabBar: () => void;
  setTabBarHeight: (h: number) => void;
}

const TabBarContext = createContext<TabBarCtx | null>(null);

export function TabBarProvider({ children }: { children: React.ReactNode }) {
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const lastY             = useRef(0);
  const hidden            = useRef(false);
  const hideOffset        = useRef(150);

  const setTabBarHeight = useCallback((h: number) => {
    hideOffset.current = h;
  }, []);

  const animHide = useCallback(() => {
    Animated.timing(tabBarTranslateY, {
      toValue:         hideOffset.current,
      duration:        HIDE_DURATION,
      easing:          Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [tabBarTranslateY]);

  const animShow = useCallback(() => {
    Animated.timing(tabBarTranslateY, {
      toValue:         0,
      duration:        SHOW_DURATION,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [tabBarTranslateY]);

  const onTabScroll = useCallback((e: any) => {
    const y    = e.nativeEvent.contentOffset.y;
    const diff = y - lastY.current;
    lastY.current = y;
    if (Math.abs(diff) < THRESHOLD) return;
    if (diff > 0 && y > 50 && !hidden.current) {
      hidden.current = true;
      animHide();
    } else if (diff < 0 && hidden.current) {
      hidden.current = false;
      animShow();
    }
  }, [animHide, animShow]);

  const resetTabBar = useCallback(() => {
    hidden.current = false;
    lastY.current  = 0;
    animShow();
  }, [animShow]);

  return (
    <TabBarContext.Provider value={{ tabBarTranslateY, onTabScroll, resetTabBar, setTabBarHeight }}>
      {children}
    </TabBarContext.Provider>
  );
}

const NOOP_CTX: TabBarCtx = {
  tabBarTranslateY: new Animated.Value(0),
  onTabScroll: () => {},
  resetTabBar: () => {},
  setTabBarHeight: () => {},
};

export function useTabBarScroll(): TabBarCtx {
  const ctx = useContext(TabBarContext);
  return ctx ?? NOOP_CTX;
}
