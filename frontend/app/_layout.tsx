import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { LogBox, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AuthProvider, useAuth } from "@/src/auth";
import { ErrorBoundary } from "@/src/components/error-boundary";
import { LoadingScreen } from "@/src/components/LoadingScreen";
import { ToastProvider } from "@/src/components/Toast";
import { queryClient } from "@/src/query-client";
import { useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  // Icon fonts are pre-loaded here too so icons show instantly (Expo Go Android).
  const [fontsLoaded, fontsError] = useFonts({
    "Caveat-Bold": require("../assets/fonts/Caveat-Bold.ttf"),
    "Nunito-Regular": require("../assets/fonts/Nunito-Regular.ttf"),
    "Nunito-Bold": require("../assets/fonts/Nunito-Bold.ttf"),
    Feather: require("../assets/fonts/Feather.ttf"),
    MaterialDesignIcons: require("../assets/fonts/MaterialDesignIcons.ttf"),
  });
  // Si les polices tardent ou échouent, on démarre quand même au bout de 4 s plutôt que de rester bloqué.
  const [fontsGaveUp, setFontsGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontsGaveUp(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <AuthProvider>
              <ToastProvider>
                {fontsLoaded || fontsError || fontsGaveUp ? <AppStack /> : <LoadingScreen fontsReady={false} stage="polices" />}
              </ToastProvider>
            </AuthProvider>
          </KeyboardProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

// Routes: only the login page when logged out; Réglages only for the admin.
function AppStack() {
  const { user, ready } = useAuth();
  const { scheme, colors } = useTheme();
  if (!ready) return <LoadingScreen stage="connexion" />;
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="index" />
          <Stack.Screen name="dates" />
          <Stack.Screen name="loutres" />
          <Stack.Screen name="objectifs" />
          <Stack.Screen name="trophees" />
          <Stack.Screen name="versets/index" />
          <Stack.Screen name="versets/[id]" />
          <Stack.Screen name="librairie/index" />
          <Stack.Screen name="librairie/[id]" />
          <Stack.Screen name="lecture" />
          <Stack.Screen name="cemantix" />
          <Stack.Screen name="voyages" />
          <Stack.Protected guard={user?.role === "admin"}>
            <Stack.Screen name="reglages/index" />
            <Stack.Screen name="reglages/carte" />
            <Stack.Screen name="ecrire" />
          </Stack.Protected>
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
