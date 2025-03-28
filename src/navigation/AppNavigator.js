import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MealsScreen from '../screens/MealsScreen';
import AllMealsScreen from '../screens/AllMealsScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#121212' },
      }}
    >
      <Stack.Screen name="Meals" component={MealsScreen} />
      <Stack.Screen 
        name="AllMeals" 
        component={AllMealsScreen}
        options={{
          presentation: 'modal',
          cardStyle: { backgroundColor: '#121212' },
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
