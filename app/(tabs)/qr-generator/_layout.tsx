import { Stack } from "expo-router";

export default function QrGeneratorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="standard" />
      <Stack.Screen name="business" />
      <Stack.Screen name="private" />
    </Stack>
  );
}
