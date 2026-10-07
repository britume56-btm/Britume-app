import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/Main/HomeScreen';
import ProfileScreen from '../screens/Main/ProfileScreen';
import SettingsScreen from '../screens/Main/SettingsScreen';
import ModuleScreen from '../screens/Main/ModuleScreen';
import AppLockScreen from '../screens/Security/AppLockScreen';
import SocialScreen from '../screens/Social/SocialScreen';
import PublicProfileScreen from '../screens/Social/PublicProfileScreen';
import FollowListScreen from '../screens/Social/FollowListScreen';
import ChatScreen from '../screens/Chat/ChatScreen';
import ConversationScreen from '../screens/Chat/ConversationScreen';
import GamesScreen from '../screens/Main/GamesScreen';
import ThemesScreen from '../screens/Main/ThemesScreen';
import GalleryScreen from '../screens/Main/GalleryScreen';
import NotificationsScreen from '../screens/Main/NotificationsScreen';
import PremiumScreen from '../screens/Main/PremiumScreen';
import LabsScreen from '../screens/Main/LabsScreen';
import { useAppTheme } from '../theme/AppThemeContext';
import type { MainTabParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  const { palette } = useAppTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: palette.background,
        },
        headerTintColor: palette.text,
        headerTitleStyle: {
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
      }}
    >
      <Tab.Screen name="LIVING" component={HomeScreen} options={{ title: 'LIVING' }} />
      <Tab.Screen name="PROFILE" component={ProfileScreen} options={{ title: 'PROFILE' }} />
      <Tab.Screen name="SETTINGS" component={SettingsScreen} options={{ title: 'SETTINGS' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { palette } = useAppTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.text,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Module"
          component={ModuleScreen}
          options={({ route }) => ({ title: route.params.section })}
        />
        <Stack.Screen
          name="Social"
          component={SocialScreen}
          options={{ title: 'SOCIAL' }}
        />
        <Stack.Screen
          name="PublicProfile"
          component={PublicProfileScreen}
          options={{ title: 'PROFILE' }}
        />
        <Stack.Screen
          name="FollowList"
          component={FollowListScreen}
          options={({ route }) => ({
            title: route.params.kind === 'followers' ? 'FOLLOWERS' : 'FOLLOWING',
          })}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ title: 'CHAT' }}
        />
        <Stack.Screen
          name="Conversation"
          component={ConversationScreen}
          options={{ title: 'CHAT' }}
        />
        <Stack.Screen
          name="Security"
          component={AppLockScreen}
          options={{ title: 'APP LOCK' }}
        />
        <Stack.Screen name="Games" component={GamesScreen} options={{ title: 'GAMES' }} />
        <Stack.Screen name="Themes" component={ThemesScreen} options={{ title: 'THEMES' }} />
        <Stack.Screen name="Gallery" component={GalleryScreen} options={{ title: 'GALLERY' }} />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'NOTIFICATIONS' }}
        />
        <Stack.Screen name="Premium" component={PremiumScreen} options={{ title: 'PREMIUM' }} />
        <Stack.Screen name="Labs" component={LabsScreen} options={{ title: 'LABS' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
