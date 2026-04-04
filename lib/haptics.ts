import * as ExpoHaptics from "expo-haptics";

export { ImpactFeedbackStyle, NotificationFeedbackType } from "expo-haptics";

let _enabled = false;

export function setHapticsEnabled(enabled: boolean) {
  _enabled = enabled;
}

export function isHapticsEnabled(): boolean {
  return _enabled;
}

export function impactAsync(style: ExpoHaptics.ImpactFeedbackStyle): Promise<void> {
  if (_enabled) return ExpoHaptics.impactAsync(style);
  return Promise.resolve();
}

export function notificationAsync(type: ExpoHaptics.NotificationFeedbackType): Promise<void> {
  if (_enabled) return ExpoHaptics.notificationAsync(type);
  return Promise.resolve();
}

export function selectionAsync(): Promise<void> {
  if (_enabled) return ExpoHaptics.selectionAsync();
  return Promise.resolve();
}
