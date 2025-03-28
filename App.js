import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import TabNavigator from './src/components/TabNavigator';
import AuthScreen from './src/screens/AuthScreen';
import HealthDetailsScreen from './src/screens/HealthDetailsScreen';
import { DistanceProvider } from './src/context/DistanceContext';
import { StatusBar } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import LogWorkoutScreen from './src/screens/LogWorkoutScreen';
import MealsScreen from './src/screens/MealsScreen';
import AllWorkoutsScreen from './src/screens/AllWorkoutsScreen';
import WorkoutDetailsScreen from './src/screens/WorkoutDetailsScreen';
import WorkoutsScreen from './src/screens/WorkoutsScreen';
import AllMealsScreen from './src/screens/AllMealsScreen';
import MealDetailsScreen from './src/screens/MealsDetailsScreen';
import ChatScreen from './src/screens/ChatScreen';
import 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import UserDetailsScreen from './src/screens/UserDetailsScreen';
import HomeScreen from './src/screens/HomeScreen';
import { supabase } from './src/services/supabaseClient';
import { FontSizeProvider } from './src/context/FontSizeContext';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user } = useAuth();
  const [hasProfile, setHasProfile] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      try {
        if (!user) {
          setHasProfile(false);
          setChecking(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_details')
          .select('id')
          .eq('user_id', user.id)
          .single();

        setHasProfile(!!data);
      } catch (error) {
        console.error('Profile check failed:', error);
        setHasProfile(false);
      } finally {
        setChecking(false);
      }
    }

    checkProfile();
  }, [user]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#121212' },
      }}
    >
      {!user ? (
        // Auth Stack
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
          options={{ gestureEnabled: false }} 
        />
      ) : !hasProfile ? (
        // User Details Stack
        <Stack.Screen 
          name="UserDetails" 
          component={UserDetailsScreen}
          options={{ gestureEnabled: false }}
        />
      ) : (
        // Main App Stack
        <>
          <Stack.Screen 
            name="Main" 
            component={TabNavigator}
            options={{ gestureEnabled: false }}
          />
          <Stack.Group screenOptions={{ presentation: 'modal' }}>
            <Stack.Screen 
              name="HealthDetails" 
              component={HealthDetailsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Health Details',
                headerStyle: { backgroundColor: '#121212' },
                headerTintColor: '#fff'
              }}
            />
            <Stack.Screen 
              name="LogWorkout" 
              component={LogWorkoutScreen}
              options={{
                headerShown: true,
                headerTitle: 'Log Workout',
                headerStyle: { backgroundColor: '#121212' },
                headerTintColor: '#fff'
              }}
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{
                headerShown: true,
                headerTitle: 'Chat',
                headerStyle: { backgroundColor: '#121212' },
                headerTintColor: '#fff'
              }}
            />
          </Stack.Group>
          <Stack.Group>
            <Stack.Screen 
              name="WorkoutDetails" 
              component={WorkoutDetailsScreen}
              options={{
                headerShown: false,
                presentation: 'card'
              }}
            />
            <Stack.Screen 
              name="MealDetails" 
              component={MealDetailsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Meal Details',
                headerStyle: { backgroundColor: '#121212' },
                headerTintColor: '#fff'
              }}
            />
            <Stack.Screen 
              name="AllWorkouts" 
              component={AllWorkoutsScreen}
              options={{
                headerShown: true,
                headerTitle: 'All Workouts',
                headerStyle: { backgroundColor: '#121212' },
                headerTintColor: '#fff'
              }}
            />
            <Stack.Screen 
              name="AllMeals" 
              component={AllMealsScreen}
              options={{
                headerShown: true,
                headerTitle: 'All Meals',
                headerStyle: { backgroundColor: '#121212' },
                headerTintColor: '#fff'
              }}
            />
          </Stack.Group>
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <FontSizeProvider>
      <AuthProvider>
        <DistanceProvider>
          <SafeAreaProvider>
            <NavigationContainer>
              <StatusBar barStyle="light-content" />
              <AppNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </DistanceProvider>
      </AuthProvider>
    </FontSizeProvider>
  );
}
