import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import InboxScreen from "../screens/InboxScreen";
import EmailDetailScreen from "../screens/EmailDetailScreen";
import ReplyScreen from "../screens/ReplyScreen";
import SurveyScreen from "../screens/SurveyScreen";
import BlogScreen from "../screens/BlogScreen";
import CreateBlogScreen from "../screens/CreateBlogScreen";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../config/theme";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Inbox: undefined;
  EmailDetail: { emailId: string };
  Reply: { emailId: string; toEmail: string; toName?: string; subject: string };
  Survey: undefined;
  Blog: undefined;
  CreateBlog: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Inbox" component={InboxScreen} />
            <Stack.Screen name="EmailDetail" component={EmailDetailScreen} />
            <Stack.Screen name="Reply" component={ReplyScreen} />
            <Stack.Screen name="Survey" component={SurveyScreen} />
            <Stack.Screen name="Blog" component={BlogScreen} />
            <Stack.Screen name="CreateBlog" component={CreateBlogScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
