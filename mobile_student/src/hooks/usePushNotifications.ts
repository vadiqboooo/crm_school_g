import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { storage } from "../lib/storage";

const LAST_TOKEN_KEY = "s_push_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Основной",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#4f46e5",
    sound: "default",
  });
}

async function getPushToken(): Promise<string | null> {
  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return tokenData.data;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const respListener = useRef<Notifications.EventSubscription | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const curId = user?.id ?? null;
    const prevId = prevUserIdRef.current;

    // User signed out → unregister old token from server
    if (prevId && !curId) {
      (async () => {
        const oldToken = await storage.getItem(LAST_TOKEN_KEY);
        if (oldToken) {
          await api.unregisterPushToken(oldToken).catch(() => {});
          await storage.removeItem(LAST_TOKEN_KEY);
        }
      })();
    }

    prevUserIdRef.current = curId;

    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await getPushToken();
        if (!token || cancelled) return;
        await api.registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
        await storage.setItem(LAST_TOKEN_KEY, token);
      } catch (e) {
        console.warn("Push registration failed:", e);
      }
    })();

    respListener.current = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as {
        type?: string;
        room_id?: string;
        notification_id?: string;
      };
      if (!data) return;
      if (data.type === "chat" && data.room_id) {
        navigation.navigate("Main", {
          screen: "ChatTab",
          params: {
            screen: "ChatRoom",
            params: { roomId: data.room_id },
            initial: false,
          },
        });
      } else if (data.type === "notification") {
        navigation.navigate("Main", {
          screen: "HomeTab",
          params: { screen: "Notifications" },
        });
      }
    });

    return () => {
      cancelled = true;
      respListener.current?.remove();
      respListener.current = null;
    };
  }, [user?.id, navigation]);

  return null;
}
