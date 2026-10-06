import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/Main/HomeScreen';
import ProfileScreen from '../screens/Main/ProfileScreen';
import SettingsScreen from '../screens/Main/SettingsScreen';
import ModuleScreen from '../screens/Main/ModuleScreen';
import AppLockScreen from '../screens/Security/AppLockScreen';
import type { MainTabParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#070b12',
        },
        headerTintColor: '#f4f6fa',
        headerTitleStyle: {
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: '#101722',
          borderTopColor: '#263247',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#d9b867',
        tabBarInactiveTintColor: '#8f9aab',
      }}
    >
      <Tab.Screen name="LIVING" component={HomeScreen} options={{ title: 'LIVING' }} />
      <Tab.Screen name="PROFILE" component={ProfileScreen} options={{ title: 'PROFILE' }} />
      <Tab.Screen name="SETTINGS" component={SettingsScreen} options={{ title: 'SETTINGS' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#070b12' },
          headerTintColor: '#f4f6fa',
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: '#070b12' },
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
          name="Security"
          component={AppLockScreen}
          options={{ title: 'APP LOCK' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
