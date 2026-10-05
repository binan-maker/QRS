import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", animationDuration: 220 }}>
      <Stack.Screen name="login" options={{ animation: "none" }} />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
