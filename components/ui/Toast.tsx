import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { View, Text, Animated, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastType = "success" | "error" | "info";

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>({ message: "", type: "success", visible: false });
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    animRef.current?.stop();
    anim.setValue(0);

    setToast({ message, type, visible: true });

    animRef.current = Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    animRef.current.start(({ finished }) => {
      if (finished) setToast(prev => ({ ...prev, visible: false }));
    });

    timerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3200);
  }, [anim]);

  const iconName: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
    success: "checkmark-circle",
    error: "alert-circle",
    info: "information-circle",
  };

  const iconColor: Record<ToastType, string> = {
    success: "#22C55E",
    error: "#F87171",
    info: "#818CF8",
  };

  const topPad = Platform.OS === "web" ? 20 : insets.top + 12;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            {
              top: topPad,
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-14, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name={iconName[toast.type]} size={18} color={iconColor[toast.type]} />
          <Text style={styles.toastText} numberOfLines={2}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1E293B",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#F1F5F9",
    lineHeight: 20,
  },
});
