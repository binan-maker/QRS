import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
function isValidHost(host: string | undefined): host is string {
  return (
    !!host &&
    host !== "localhost" &&
    host !== "127.0.0.1" &&
    !host.startsWith(":")
  );
}

export function getApiUrl(): string {
  const explicitDomain = process.env.EXPO_PUBLIC_DOMAIN;
  if (explicitDomain && isValidHost(explicitDomain.split(":")[0])) {
    return new URL(`https://${explicitDomain}`).href;
  }

  const packagerHost = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
  if (isValidHost(packagerHost)) {
    return `https://${packagerHost}:5000/`;
  }

  if (Platform.OS !== "web") {
    const expoGoConfig = (Constants as any).expoGoConfig;
    const debuggerHost =
      expoGoConfig?.debuggerHost ||
      (Constants as any).manifest?.debuggerHost;

    if (typeof debuggerHost === "string") {
      const hostname = debuggerHost.split(":")[0];
      if (isValidHost(hostname)) {
        return `https://${hostname}:5000/`;
      }
    }
  }

  return "/";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
