import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  RegisterEmail: undefined;
  VerifyCode: { email: string };
  CompleteProfile: { registration_token: string; email: string };
};

export type HomeStackParamList = {
  Home: undefined;
  Exams: undefined;
  ExamRegister: { sessionId?: string } | undefined;
  Results: undefined;
  Notifications: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { roomId: string; title?: string };
  CreateGroup: undefined;
  ChatInfo: { roomId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ChatTab: NavigatorScreenParams<ChatStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};
