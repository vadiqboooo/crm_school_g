import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterEmailScreen } from "../screens/RegisterEmailScreen";
import { VerifyCodeScreen } from "../screens/VerifyCodeScreen";
import { CompleteProfileScreen } from "../screens/CompleteProfileScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RegisterEmail" component={RegisterEmailScreen} />
      <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </Stack.Navigator>
  );
}
