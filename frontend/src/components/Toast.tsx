// Tiny toast system mounted once at the root.
import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";
import { Animated, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, makeStyles } from "@/src/theme";

const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  const show = useCallback(
    (msg: string) => {
      setMessage(msg);
      if (timer.current) clearTimeout(timer.current);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMessage(null));
      }, 2600);
    },
    [anim],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <Animated.View
          pointerEvents="none"
          testID="toast"
          style={[
            styles.toast,
            {
              top: insets.top + 64, // below the screen headers, never over their buttons
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
            },
          ]}
        >
          <Text style={styles.text} testID="toast-message">
            {message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const useStyles = makeStyles((c) => ({
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: c.surfaceInverse,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
  },
  text: { fontFamily: fonts.bodyBold, fontSize: 14, color: c.onSurfaceInverse, textAlign: "center" },
}));
