import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/Main/HomeScreen';
import ProfileScreen from '../screens/Main/ProfileScreen';
import SettingsScreen from '../screens/Main/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
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
        <Tab.Screen
          name="LIVING"
          component={HomeScreen}
          options={{ title: 'LIVING' }}
        />
        <Tab.Screen
          name="PROFILE"
          component={ProfileScreen}
          options={{ title: 'PROFILE' }}
        />
        <Tab.Screen
          name="SETTINGS"
          component={SettingsScreen}
          options={{ title: 'SETTINGS' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
