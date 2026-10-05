// Ambient type declarations for React Native / Expo modules when referenced by shared code in Next.js web build

declare var __DEV__: boolean | undefined;

declare module "@react-native-async-storage/async-storage" {
  export interface AsyncStorageStatic {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    getAllKeys(): Promise<string[]>;
    multiRemove(keys: string[]): Promise<void>;
    clear(): Promise<void>;
    [key: string]: any;
  }
  const AsyncStorage: AsyncStorageStatic;
  export default AsyncStorage;
}

declare module "expo-crypto" {
  export enum CryptoDigestAlgorithm {
    SHA256 = "SHA-256",
    SHA384 = "SHA-384",
    SHA512 = "SHA-512",
    MD5 = "MD5",
    SHA1 = "SHA-1",
  }
  export enum CryptoEncoding {
    HEX = "hex",
    BASE64 = "base64",
  }
  export function digestStringAsync(
    algorithm: CryptoDigestAlgorithm | string,
    str: string,
    options?: { encoding?: CryptoEncoding | string }
  ): Promise<string>;
}

declare module "expo/fetch" {
  export const fetch: typeof globalThis.fetch;
}

declare module "expo-constants" {
  const Constants: {
    expoConfig?: Record<string, any>;
    expoGoConfig?: Record<string, any>;
    manifest?: Record<string, any>;
    [key: string]: any;
  };
  export default Constants;
}

declare module "react-native" {
  export const Platform: {
    OS: "ios" | "android" | "web" | "windows" | "macos";
    select: <T>(specifics: { [platform: string]: T }) => T;
    [key: string]: any;
  };
  export const StyleSheet: any;
  export const View: any;
  export const Text: any;
}

declare module "@tanstack/react-query" {
  export type QueryFunction<T = unknown, TQueryKey extends readonly unknown[] = readonly unknown[]> = (context: {
    queryKey: TQueryKey;
    signal?: AbortSignal;
    meta?: Record<string, unknown>;
    pageParam?: unknown;
  }) => T | Promise<T>;

  export class QueryClient {
    constructor(config?: any);
    getQueryData<T = unknown>(queryKey: readonly unknown[]): T | undefined;
    setQueryData<T = unknown>(queryKey: readonly unknown[], updater: T | ((old: T | undefined) => T | undefined)): T | undefined;
    invalidateQueries(filters?: any): Promise<void>;
    clear(): void;
    [key: string]: any;
  }

  export const QueryClientProvider: any;
  export function useQuery<T = any>(options: any): any;
  export function useMutation<T = any>(options: any): any;
  export function useInfiniteQuery<T = any>(options: any): any;
  export function useQueryClient(): QueryClient;
}

