import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Pedometer } from 'expo-sensors';
import { DistanceContext } from '../context/DistanceContext';
import { supabase } from '../services/supabaseClient';
import { useScaledStyles } from '../hooks/useScaledStyles';

const STRIDE_LENGTH = 0.762; // Average stride length in meters
const STEPS_PER_KILOMETER = 1312; // Average steps per kilometer
const UPDATE_INTERVAL = 1000; // Update interval in milliseconds

const HomeScreen = () => {
  const { user, profile } = useAuth();
  const navigation = useNavigation();
  const { distanceGoal } = useContext(DistanceContext);
  const [stepCount, setStepCount] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
  const [subscription, setSubscription] = useState(null);
  const [recentWorkout, setRecentWorkout] = useState(null);
  const [recentMeal, setRecentMeal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [dailySteps, setDailySteps] = useState(0);

  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();

  const styles = useScaledStyles(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    scrollView: {
      flex: 1,
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 30,
    },
    date: {
      color: '#666666',
      fontSize: 16,  // Was scaleFontSize(16)
      marginBottom: 5,
    },
    welcomeText: {
      color: '#FFFFFF',
      fontSize: 28,  // Was scaleFontSize(28)
      fontWeight: 'bold',
    },
    profileImagePlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#333333',
      overflow: 'hidden',
    },
    profileImage: {
      width: '100%',
      height: '100%',
    },
    sectionTitle: {
      color: '#FFFFFF',
      fontSize: 24,  // Was scaleFontSize(24)
      fontWeight: 'bold',
      marginBottom: 15,
    },
    activityCard: {
      backgroundColor: '#1C1C1E',
      borderRadius: 15,
      padding: 20,
      marginBottom: 30,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    activityLabel: {
      color: '#666666',
      fontSize: 16,
      marginBottom: 5,
    },
    activityValue: {
      color: '#FFFFFF',
      fontSize: 24,  // Was scaleFontSize(24)
      marginBottom: 15,
    },
    progressRing: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 10,
      borderColor: '#333333',
      justifyContent: 'center',
      alignItems: 'center',
      transform: [{ rotate: '-90deg' }],
    },
    progressRingInner: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 10,
      borderLeftColor: '#8B5CF6',
      borderTopColor: '#8B5CF6',
      borderRightColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    showMoreText: {
      color: '#4CAF50',
      fontSize: 16,
    },
    listItem: {
      backgroundColor: '#1C1C1E',
      borderRadius: 15,
      padding: 20,
      marginBottom: 15,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    listItemTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      marginBottom: 5,
    },
    listItemDate: {
      color: '#666666',
      fontSize: 14,
    },
    mealTime: {
      color: '#666666',
      fontSize: 14,
    },
    addButton: {
      paddingVertical: 15,
      marginBottom: 30,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
    },
    discoverWorkout: {
      backgroundColor: '#1C1C1E',
      borderRadius: 15,
      padding: 20,
      marginBottom: 30,
    },
    discoverWorkoutText: {
      color: '#FFFFFF',
      fontSize: 18,
    },
    noDataText: {
      color: '#666666',
      fontSize: 16,
      marginBottom: 15,
      textAlign: 'center',
      padding: 20,
    },
    activitySubtext: {
      color: '#8B5CF6',
      fontSize: 12,
      marginTop: -10,
    },
    distanceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 5,
    },
    distanceValue: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: 'bold',
    },
    distanceUnit: {
      color: '#666666',
      fontSize: 16,
      marginLeft: 4,
    },
    progressRingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressPercentage: {
      position: 'absolute',
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: 'bold',
    },
  }));

  useEffect(() => {
    subscribe();
    fetchUserProfile();
    fetchRecentWorkout();
    fetchRecentMeal();
    return () => unsubscribe();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        await Promise.all([
          fetchRecentWorkout(),
          fetchRecentMeal()
        ]);
      };

      refreshData();
    }, [])
  );

  const subscribe = async () => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(String(isAvailable));

      if (isAvailable) {
        // Get today's start timestamp
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get current timestamp
        const now = new Date();

        // Get initial steps for today
        const { steps: initialSteps } = await Pedometer.getStepCountAsync(today, now);
        setDailySteps(initialSteps);
        setDistance(calculateDistance(initialSteps));
        
        // Watch for new steps
        const newSubscription = Pedometer.watchStepCount(result => {
          setStepCount(prevCount => {
            const newTotal = initialSteps + result.steps;
            setDailySteps(newTotal);
            setDistance(calculateDistance(newTotal));
            return result.steps;
          });
        });

        setSubscription(newSubscription);
      }
    } catch (error) {
      console.error('Pedometer error:', error);
      setIsPedometerAvailable('false');
    }
  };

  const unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      //console.error('Error fetching user profile:', error);
    }
  };

  const fetchRecentWorkout = async () => {
    try {
      // Check if user exists before making the request
      if (!user) return;

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setRecentWorkout(data[0]);
      } else {
        setRecentWorkout(null);
      }
    } catch (error) {
      console.error('Error fetching recent workout:', error);
    }
  };

  const fetchRecentMeal = async () => {
    try {
      // Check if user exists before making the request
      if (!user) return;

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setRecentMeal(data[0]);
      } else {
        setRecentMeal(null);
      }
    } catch (error) {
      console.error('Error fetching recent meal:', error);
    }
  };

  const handleShowMoreWorkouts = () => {
    navigation.navigate('AllWorkouts');
  };

  const handleShowMoreMeals = () => {
    navigation.navigate('AllMeals');
  };

  const handleLogNewWorkout = () => {
    navigation.navigate('LogWorkout');
  };

  const handleAddNewMeal = () => {
    navigation.navigate('Meals');
  };

  const handleDiscoverWorkouts = () => {
    // If you have a discover workouts screen, add navigation to it
    navigation.navigate('AllWorkouts', { tab: 'discover' });
  };

  const calculateDistance = (steps) => {
    // Method 1: Using stride length
    const distanceByStride = (steps * STRIDE_LENGTH) / 1000;
    
    // Method 2: Using steps per kilometer
    const distanceBySteps = steps / STEPS_PER_KILOMETER;
    
    // Take the average of both methods for better accuracy
    const averageDistance = (distanceByStride + distanceBySteps) / 2;
    
    // Return with 2 decimal places
    return Number(averageDistance.toFixed(2));
  };

  const ActivityStatus = () => {
    // Calculate the progress percentage (0 to 1)
    const progress = Math.min(distance / distanceGoal, 1);
    // Convert to degrees (0 to 360)
    const rotationDegrees = progress * 360;

    return (
      <View style={styles.activityCard}>
        <View>
          <Text style={styles.activityLabel}>Steps Today</Text>
          <Text style={styles.activityValue}>
            {isPedometerAvailable === 'false' ? 'Not available' : dailySteps.toLocaleString()}
          </Text>
          <Text style={styles.activityLabel}>Distance</Text>
          <View style={styles.distanceContainer}>
            <Text style={styles.distanceValue}>{distance.toFixed(1)}</Text>
            <Text style={styles.distanceUnit}> / {distanceGoal} km</Text>
          </View>
        </View>
        <View style={styles.progressRingContainer}>
          <View style={styles.progressRing}>
            <View style={[
              styles.progressRingInner,
              {
                transform: [
                  { rotate: `${rotationDegrees}deg` }
                ]
              }
            ]} />
          </View>
          <Text style={styles.progressPercentage}>{Math.round(progress * 100)}%</Text>
        </View>
      </View>
    );
  };

  const WorkoutItem = ({ title, date, id }) => (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => navigation.navigate('WorkoutDetails', { workoutId: id })}
    >
      <Text style={styles.listItemTitle}>{title}</Text>
      <Text style={styles.listItemDate}>{date}</Text>
    </TouchableOpacity>
  );

  const MealItem = ({ title, time, date, id }) => (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => navigation.navigate('MealDetails', { mealId: id })}
    >
      <View>
        <Text style={styles.listItemTitle}>{title}</Text>
        <Text style={styles.mealTime}>{time}</Text>
      </View>
      <Text style={styles.listItemDate}>{date}</Text>
    </TouchableOpacity>
  );

  const navigateToSettings = () => {
    navigation.navigate('Settings');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{dateString}</Text>
            <Text style={styles.welcomeText}>
              Welcome Back, {userProfile?.username || 'User'}!
            </Text>
          </View>
          <View style={styles.profileImagePlaceholder}>
            <TouchableOpacity onPress={navigateToSettings}>
              <Image
                source={userProfile?.avatar_url ? { uri: userProfile.avatar_url } : require('../assets/default-avatar.png')}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Activity</Text>
        <ActivityStatus />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workouts</Text>
          <TouchableOpacity onPress={handleShowMoreWorkouts}>
            <Text style={styles.showMoreText}>Show More</Text>
          </TouchableOpacity>
        </View>
        {recentWorkout ? (
          <WorkoutItem 
            title={recentWorkout.name} 
            date={new Date(recentWorkout.created_at).toLocaleDateString()}
            id={recentWorkout.id}
          />
        ) : (
          <Text style={styles.noDataText}>No recent workouts</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleLogNewWorkout}>
          <Text style={styles.addButtonText}>+ Log a New Workout</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meals</Text>
          <TouchableOpacity onPress={handleShowMoreMeals}>
            <Text style={styles.showMoreText}>Show More</Text>
          </TouchableOpacity>
        </View>
        {recentMeal ? (
          <MealItem 
            title={recentMeal.meal_name}
            time={new Date(recentMeal.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
            date={new Date(recentMeal.created_at).toLocaleDateString()}
            id={recentMeal.id}
          />
        ) : (
          <Text style={styles.noDataText}>No recent meals</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddNewMeal}>
          <Text style={styles.addButtonText}>+ Add a New Meal</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Discover Workouts</Text>
          <TouchableOpacity onPress={handleDiscoverWorkouts}>
            <Text style={styles.showMoreText}>Show More</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.discoverWorkout}
          onPress={handleDiscoverWorkouts}
        >
          <Text style={styles.discoverWorkoutText}>Power Up!</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;