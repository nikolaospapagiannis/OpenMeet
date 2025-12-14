import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import MeetingsListScreen from '../screens/meetings/MeetingsListScreen';
import MeetingDetailScreen from '../screens/meetings/MeetingDetailScreen';
import AudioPlayerScreen from '../screens/player/AudioPlayerScreen';

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  MeetingDetail: { meetingId: string };
  AudioPlayer: { meetingId: string; audioUrl: string };
};

export type MainTabParamList = {
  Meetings: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#6b7280',
      }}>
      <Tab.Screen
        name="Meetings"
        component={MeetingsListScreen}
        options={{
          tabBarLabel: 'Meetings',
          tabBarIcon: ({ color }) => (
            <TabIcon name="calendar" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfilePlaceholder}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <TabIcon name="person" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsPlaceholder}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabIcon name="settings" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Simple tab icon component
function TabIcon({ name, color }: { name: string; color: string }) {
  return (
    <View style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 12 }} />
  );
}

// Placeholder screens
import { View, Text } from 'react-native';

function ProfilePlaceholder() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

function SettingsPlaceholder() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Settings Screen</Text>
    </View>
  );
}

function AppNavigator() {
  const { token } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!token;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="MeetingDetail"
            component={MeetingDetailScreen}
            options={{ headerShown: true, title: 'Meeting Details' }}
          />
          <Stack.Screen
            name="AudioPlayer"
            component={AudioPlayerScreen}
            options={{
              headerShown: true,
              title: 'Audio Player',
              presentation: 'modal',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default AppNavigator;
