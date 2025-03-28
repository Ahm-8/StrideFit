import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';
import { format } from 'date-fns';
import { useScaledStyles } from '../hooks/useScaledStyles';

const REFRESH_INTERVAL = 60000; // 1 minute

const calculateStats = (workouts) => {
  if (!workouts.length) return { daysActive: 0, avgIntensity: 'N/A' };

  const intensityScores = {
    'Superb': 4,
    'Good': 3,
    'Average': 2,
    'Bad': 1
  };

  const totalScore = workouts.reduce((sum, workout) => sum + intensityScores[workout.intensity], 0);
  const avgScore = totalScore / workouts.length;
  
  let avgIntensity;
  if (avgScore >= 3.5) avgIntensity = 'Superb';
  else if (avgScore >= 2.5) avgIntensity = 'Good';
  else if (avgScore >= 1.5) avgIntensity = 'Average';
  else avgIntensity = 'Bad';

  // Count unique days
  const uniqueDays = new Set(
    workouts.map(workout => 
      format(new Date(workout.created_at), 'yyyy-MM-dd')
    )
  ).size;

  return { daysActive: uniqueDays, avgIntensity };
};

const WorkoutsScreen = () => {
  const navigation = useNavigation();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef(null);

  const styles = useScaledStyles(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    mainHeader: {
      padding: 20,
    },
    mainTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#fff',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#fff',
    },
    showMoreButton: {
      color: '#8B5CF6',
      fontSize: 16,
      fontWeight: '500',
    },
    workoutsContainer: {
      padding: 15,
    },
    workoutCard: {
      backgroundColor: '#1E1E1E',
      borderRadius: 15,
      marginBottom: 15,
      overflow: 'hidden',
    },
    workoutContent: {
      padding: 15,
    },
    workoutHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    workoutMain: {
      flex: 1,
      marginRight: 15,
    },
    workoutTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    workoutName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#fff',
    },
    workoutDate: {
      color: '#888',
      fontSize: 14,
    },
    intensityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    intensityText: {
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 4,
    },
    deleteButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: '#2E2E2E',
    },
    workoutTime: {
      fontSize: 14,
      color: '#888',
      marginRight: 10,
    },
    deleteButton: {
      padding: 5,
    },
    workoutInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    intensityLabel: {
      fontSize: 14,
      color: '#888',
    },
    intensityValue: {
      color: '#8B5CF6',
      fontWeight: '600',
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyStateText: {
      color: '#666',
      fontSize: 16,
      marginTop: 10,
    },
    logWorkoutButton: {
      backgroundColor: '#8B5CF6',
      marginHorizontal: 20,
      marginVertical: 15,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    logWorkoutText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    exerciseInfo: {
      color: '#888',
      fontSize: 14,
      marginTop: 4,
    },
    intensityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      fontSize: 12,
      fontWeight: '600',
      marginRight: 10,
    },
    intensitySuperb: {
      backgroundColor: '#4CAF5033',
      color: '#4CAF50',
    },
    intensityGood: {
      backgroundColor: '#8B5CF633',
      color: '#8B5CF6',
    },
    intensityAverage: {
      backgroundColor: '#FFA72633',
      color: '#FFA726',
    },
    intensityBad: {
      backgroundColor: '#EF535033',
      color: '#EF5350',
    },
    chartContainer: {
      backgroundColor: '#1E1E1E',
      borderRadius: 15,
      padding: 20,
      marginHorizontal: 15,
      marginTop: 15,
    },
    chartTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    chart: {
      height: 200,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    barContainer: {
      flex: 1,
      alignItems: 'center',
    },
    barWrapper: {
      height: 150,
      width: 20,
      backgroundColor: '#2E2E2E',
      borderRadius: 10,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    bar: {
      width: '100%',
      borderRadius: 10,
    },
    barLabel: {
      color: '#888',
      fontSize: 12,
      marginTop: 5,
    },
    legendContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 15,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: '#2E2E2E',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 5,
    },
    legendText: {
      color: '#888',
      fontSize: 12,
    },
    statsCard: {
      backgroundColor: '#1E1E1E',
      borderRadius: 20,
      margin: 15,
      padding: 20,
    },
    statsTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 15,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#2E2E2E',
    },
    statItem: {
      alignItems: 'center',
    },
    statLabel: {
      color: '#888',
      fontSize: 14,
      marginBottom: 5,
    },
    statValue: {
      color: '#fff',
      fontSize: 24,
      fontWeight: 'bold',
    },
    workoutMain: {
      flex: 1,
    },
    workoutDate: {
      color: '#888',
      fontSize: 14,
      marginTop: 4,
    },
    intensityText: {
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 4,
    },
    intensityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 10,
    },
  }));

  useFocusEffect(
    React.useCallback(() => {
      // Initial fetch without checking loading state
      fetchTodayWorkouts();

      // Set up interval for regular checks
      intervalRef.current = setInterval(fetchTodayWorkouts, REFRESH_INTERVAL);

      // Cleanup on screen unfocus
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, []) // Remove dependencies that cause re-renders
  );

  const fetchTodayWorkouts = async () => {
    // Only prevent fetching during manual refresh
    if (refreshing) return;
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch workouts with their exercises in a single query
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            exercise_name,
            set_number,
            weight,
            reps
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (workoutsError) throw workoutsError;

      // Process the workouts to create exercise summaries
      const processedWorkouts = workouts.map(workout => ({
        ...workout,
        exerciseSummary: workout.workout_exercises.reduce((acc, exercise) => {
          if (!acc[exercise.exercise_name]) {
            acc[exercise.exercise_name] = {
              sets: []
            };
          }
          acc[exercise.exercise_name].sets.push({
            weight: exercise.weight,
            reps: exercise.reps
          });
          return acc;
        }, {})
      }));

      setWorkouts(processedWorkouts);
    } catch (error) {
      console.error('Error fetching workouts:', error);
      if (!refreshing) {
        Alert.alert('Error', 'Failed to fetch workouts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = async (workoutId) => {
    try {
      Alert.alert(
        "Delete Workout",
        "Are you sure you want to delete this workout?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setLoading(true);
              const { error } = await supabase
                .from('workouts')
                .delete()
                .eq('id', workoutId);

              if (error) throw error;
              
              // Refresh the workouts list
              await fetchTodayWorkouts();
              Alert.alert('Success', 'Workout deleted successfully');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting workout:', error);
      Alert.alert('Error', 'Failed to delete workout');
    } finally {
      setLoading(false);
    }
  };

  const handleShowMore = () => {
    navigation.navigate('AllWorkouts');
  };

  const handleWorkoutPress = (workout) => {
    navigation.navigate('WorkoutDetails', { workoutId: workout.id });
  };

  const handleLogWorkout = () => {
    navigation.navigate('LogWorkout');
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchTodayWorkouts().finally(() => setRefreshing(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
          />
        }
      >
        <View style={styles.mainHeader}>
          <Text style={styles.mainTitle}>Workouts</Text>
        </View>

        {/* Performance Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Workout Performance</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Days Active</Text>
              <Text style={styles.statValue}>{calculateStats(workouts).daysActive}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Intensity</Text>
              <Text style={[
                styles.statValue, 
                { color: getIntensityColor(calculateStats(workouts).avgIntensity) }
              ]}>
                {calculateStats(workouts).avgIntensity}
              </Text>
            </View>
          </View>
          <WorkoutIntensityChart workouts={workouts} styles={styles} />
        </View>

        <TouchableOpacity style={styles.logWorkoutButton} onPress={handleLogWorkout}>
          <Text style={styles.logWorkoutText}>+ Log a New Workout</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Workouts</Text>
          <TouchableOpacity onPress={handleShowMore}>
            <Text style={styles.showMoreButton}>Show More</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : workouts.length > 0 ? (
          <View style={styles.workoutsContainer}>
            {workouts.map(workout => (
              <TouchableOpacity
                key={workout.id}
                style={styles.workoutCard}
                onPress={() => handleWorkoutPress(workout)}
              >
                <View style={styles.workoutContent}>
                  <View style={styles.workoutHeader}>
                    <View style={styles.workoutMain}>
                      <View style={styles.workoutTitleRow}>
                        <Text style={styles.workoutName}>{workout.name}</Text>
                        <View style={[
                          styles.intensityBadge,
                          { backgroundColor: `${getIntensityColor(workout.intensity)}20` }
                        ]}>
                          <Ionicons 
                            name="fitness" 
                            size={14} 
                            color={getIntensityColor(workout.intensity)} 
                          />
                          <Text style={[
                            styles.intensityText,
                            { color: getIntensityColor(workout.intensity) }
                          ]}>
                            {workout.intensity}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.workoutDate}>
                        {format(new Date(workout.created_at), 'EEEE, MMMM d • h:mm a')}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleDeleteWorkout(workout.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color="#666" />
            <Text style={styles.emptyStateText}>No workouts logged today</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const WorkoutIntensityChart = ({ workouts, styles }) => {
  const intensityScores = {
      'Superb': 4,
      'Good': 3,
      'Average': 2,
      'Bad': 1
  };

  const chartData = workouts.map(workout => ({
      date: format(new Date(workout.created_at), 'MMM d'),
      score: intensityScores[workout.intensity] || 0,
      intensity: workout.intensity
  })).slice(-7); // Last 7 workouts

  return (
      <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Workout Performance</Text>
          <View style={styles.chart}>
              {chartData.map((data, index) => (
                  <View key={index} style={styles.barContainer}>
                      <View style={styles.barWrapper}>
                          <View 
                              style={[
                                  styles.bar, 
                                  { 
                                      height: `${(data.score / 4) * 100}%`,
                                      backgroundColor: getIntensityColor(data.intensity)
                                  }
                              ]} 
                          />
                      </View>
                      <Text style={styles.barLabel}>{data.date}</Text>
                  </View>
              ))}
          </View>
          <View style={styles.legendContainer}>
              {Object.keys(intensityScores).map((intensity) => (
                  <View key={intensity} style={styles.legendItem}>
                      <View 
                          style={[
                              styles.legendDot,
                              { backgroundColor: getIntensityColor(intensity) }
                          ]} 
                      />
                      <Text style={styles.legendText}>{intensity}</Text>
                  </View>
              ))}
          </View>
      </View>
  );
};

const getIntensityColor = (intensity) => {
  switch (intensity) {
      case 'Superb': return '#4CAF50';
      case 'Good': return '#8B5CF6';
      case 'Average': return '#FFA726';
      case 'Bad': return '#EF5350';
      default: return '#666';
  }
};

export default WorkoutsScreen;