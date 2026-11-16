// Connexion : uniquement les 2 comptes du couple (pas d'inscription).
import { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { BlinkingOtter } from "@/src/components/BlinkingOtter";
import { HouseArt } from "@/src/components/HouseArt";
import { Paper } from "@/src/components/Paper";
import { Field, SketchButton } from "@/src/components/ui";
import { LOGO_IMAGE } from "@/src/config/assets";
import { fonts, makeStyles } from "@/src/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Remplis ton email et ton mot de passe");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Paper />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.logo}>
          {LOGO_IMAGE ? (
            <BlinkingOtter size={150} testID="login-logo" />
          ) : (
            <HouseArt size={110} color="#F6C6C6" lit={false} />
          )}
          <Text style={styles.title}>Nos petites maisons</Text>
          <Text style={styles.subtitle}>Rien que pour nous deux</Text>
        </View>
        <View style={styles.form}>
          <Field
            label="Email"
            testID="login-email-input"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="ton.email@gmail.com"
            returnKeyType="next"
          />
          <Field
            label="Mot de passe"
            testID="login-password-input"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {!!error && (
            <Text style={styles.error} testID="login-error">
              {error}
            </Text>
          )}
          <SketchButton label="Entrer" testID="login-submit-button" onPress={submit} loading={loading} />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 40, gap: 32 },
  logo: { alignItems: "center", gap: 4 },
  title: { fontFamily: fonts.hand, fontSize: 44, color: c.onSurface, textAlign: "center" },
  subtitle: { fontFamily: fonts.body, fontSize: 15, color: c.muted },
  form: { gap: 16 },
  error: { fontFamily: fonts.bodyBold, color: c.error, fontSize: 14 },
}));
