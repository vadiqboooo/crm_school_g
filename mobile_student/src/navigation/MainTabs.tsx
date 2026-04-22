import { useCallback, useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { Home as HomeIcon, MessageCircle, User } from "lucide-react-native";
import { HomeScreen } from "../screens/HomeScreen";
import { ExamsScreen } from "../screens/ExamsScreen";
import { ExamRegisterScreen } from "../screens/ExamRegisterScreen";
import { ResultsScreen } from "../screens/ResultsScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ChatRoomScreen } from "../screens/ChatRoomScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useChatWebSocket } from "../hooks/useChatWebSocket";
import { registerChatBadgeRefresher } from "../lib/chatBadge";
import type {
  TabParamList,
  HomeStackParamList,
  ChatStackParamList,
  ProfileStackParamList,
} from "./types";

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Exams" component={ExamsScreen} />
      <HomeStack.Screen name="ExamRegister" component={ExamRegisterScreen} />
      <HomeStack.Screen name="Results" component={ResultsScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
    </HomeStack.Navigator>
  );
}

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList" component={ChatScreen} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoomScreen} />
    </ChatStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

export function MainTabs() {
  const { user } = useAuth();
  const myId = user?.id ?? "";
  const myMemberType = user?.role === "app_user" ? "app_user" : "student";
  const [unread, setUnread] = useState(0);

  const load = useCallback(
    () =>
      api
        .getChatRooms()
        .then((rooms) => setUnread(rooms.reduce((s, r) => s + (r.unread_count ?? 0), 0)))
        .catch(() => {}),
    []
  );

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    registerChatBadgeRefresher(load);
    return () => registerChatBadgeRefresher(null);
  }, [load]);

  useChatWebSocket({
    enabled: true,
    onReconnect: load,
    onMessage: useCallback(
      (msg) => {
        if (msg.type === "new_message") {
          const m = msg.message;
          const mine = m.sender_id === myId && m.sender_type === myMemberType;
          if (!mine) setUnread((u) => u + 1);
        } else if (msg.type === "read_receipt" || msg.type === "message_deleted") {
          load();
        }
      },
      [load, myId, myMemberType]
    ),
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4f46e5",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#f3f4f6",
          paddingTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: "Главная",
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatStackNavigator}
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route) ?? "ChatList";
          return {
            tabBarLabel: "Сообщения",
            tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
            tabBarBadge: unread > 0 ? unread : undefined,
            tabBarStyle:
              focused === "ChatRoom"
                ? { display: "none" }
                : {
                    borderTopWidth: 1,
                    borderTopColor: "#f3f4f6",
                    paddingTop: 4,
                  },
          };
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: "Профиль",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
