import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import AddActivityScreen from './src/screens/AddActivityScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4B6CFF',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E6E9F2',
          height: 68,
          paddingBottom: 8,
          paddingTop: 8
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' }
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="AddActivity" component={AddActivityScreen} options={{ title: 'Add' }} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Attendance" component={AttendanceScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
