import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../lib/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

function DeepLinkHandler() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const path = parsed.path ?? "";
      const pathStr = typeof path === "string" ? path : Array.isArray(path) ? path[0] ?? "" : "";
      const pathClean = pathStr.replace(/^\//, "").split("?")[0] ?? "";
      let id: string | null = null;
      if (pathClean.startsWith("list/")) {
        id = pathClean.replace("list/", "").trim();
      } else if (parsed.hostname === "list") {
        id = pathClean.trim() || (Array.isArray(path) ? path[0] ?? null : pathStr.trim()) || null;
      }
      if (id) router.replace(`/list/${id}` as never);
    };
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", (e) => handleUrl(e.url));
    return () => sub.remove();
  }, [isAuthenticated, isLoading, router]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="auto" />
        <DeepLinkHandler />
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="index" options={{ title: "CartScout" }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
        <Stack.Screen name="register" options={{ title: "Create account" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="list/[id]" options={{ title: "List" }} />
      </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
