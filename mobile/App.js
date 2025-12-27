import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import RouteListScreen from './src/screens/RouteListScreen';
import useAuthStore from './src/stores/authStore';

const Stack = createStackNavigator();

export default function App() {
  const { token, loadSession, loading } = useAuthStore();

  useEffect(() => {
    loadSession();
  }, []);

  if (loading && !token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="RouteList" component={RouteListScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f13',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
