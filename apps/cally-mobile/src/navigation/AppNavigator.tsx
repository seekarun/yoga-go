import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useNotificationContext } from "../contexts/NotificationContext";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import ChatScreen from "../screens/ChatScreen";
import PeopleScreen from "../screens/PeopleScreen";
import EmailScreen from "../screens/EmailScreen";
import CalendarScreen from "../screens/CalendarScreen";
import EventDetailScreen from "../screens/EventDetailScreen";
import EmailDetailScreen from "../screens/EmailDetailScreen";
import ComposeScreen from "../screens/ComposeScreen";
import UserDetailScreen from "../screens/UserDetailScreen";
import ProductsScreen from "../screens/ProductsScreen";
import ProductFormScreen from "../screens/ProductFormScreen";
import SettingsScreen from "../screens/SettingsScreen";
import type { CalendarItem } from "../services/calendar";
import type { Email, ComposeMode } from "../services/email";
import type { Product } from "../services/products";
import { colors } from "../config/theme";

export type TabParamList = {
  Products: undefined;
  People: undefined;
  Email: undefined;
  Home: undefined;
  Calendar: undefined;
  "AI Chat": undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  EventDetail: { event: CalendarItem };
  EmailDetail: { email: Email };
  Compose: { mode: ComposeMode; email?: Email };
  UserDetail: { userEmail: string; userName: string };
  ProductForm: { mode: "create" } | { mode: "edit"; product: Product };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Products: "cube-outline",
  People: "people-outline",
  Email: "mail-outline",
  Home: "home-outline",
  Calendar: "calendar-outline",
  "AI Chat": "chatbubble-outline",
  Settings: "settings-outline",
};

function TabNavigator() {
  const { unreadEmailCount } = useNotificationContext();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarBadge:
          route.name === "Email" && unreadEmailCount > 0
            ? unreadEmailCount
            : undefined,
        tabBarBadgeStyle:
          route.name === "Email"
            ? { backgroundColor: colors.primary, fontSize: 10 }
            : undefined,
      })}
    >
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="People" component={PeopleScreen} />
      <Tab.Screen name="Email" component={EmailScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="AI Chat" component={ChatScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bgMain,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="EmailDetail" component={EmailDetailScreen} />
            <Stack.Screen name="Compose" component={ComposeScreen} />
            <Stack.Screen name="UserDetail" component={UserDetailScreen} />
            <Stack.Screen name="ProductForm" component={ProductFormScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
