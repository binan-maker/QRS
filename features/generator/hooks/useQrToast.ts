import { useState, useRef, useCallback, useEffect } from "react";
import { Animated } from "react-native";

export function useQrToast() {
  const [toastMsg,  setToastMsg]  = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const toastAnim  = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastMsg(msg);
      setToastType(type);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      toastTimer.current = setTimeout(() => setToastMsg(""), 2400);
    },
    [toastAnim],
  );

  // Clear any pending timer when the component using this hook unmounts.
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  return { toastMsg, toastType, toastAnim, showToast };
}
