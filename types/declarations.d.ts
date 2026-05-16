declare module 'react-native-gesture-handler';
declare module 'react-native-reanimated';
declare module 'react-native-svg';
declare module 'firebase/auth';
declare module 'firebase/firestore';
declare module 'firebase/database';
declare module 'firebase/storage';
declare module 'firebase/app';
declare module 'firebase/analytics';
declare module 'firebase/app-check';
declare module 'pg';
declare module 'expo-file-system';

declare module 'expo-modules-core' {
  export type EventSubscription = { remove(): void };
  export class NativeModule<TEventsMap = Record<string, any>> {
    addListener<TEventName extends keyof TEventsMap>(
      eventName: TEventName,
      listener: (event: TEventsMap[TEventName]) => void
    ): EventSubscription;
    removeListeners(count: number): void;
  }
  export const uuid: { v4(): string };
  export class UnavailabilityError extends Error {
    constructor(moduleName: string, propertyName: string);
  }
  export function requireOptionalNativeModule(name: string): any;
  export const requireNativeModule: (name: string) => any;
  export type SharedObject = any;
}
