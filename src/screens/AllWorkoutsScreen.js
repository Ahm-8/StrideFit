import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';
import { format } from 'date-fns';

const AllWorkoutsScreen = () => {
  const navigation = useNavigation();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllWorkouts();
  }, []);

  const fetchAllWorkouts = async () => {
    if (refreshing) return;
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        .order('created_at', { ascending: false });

      if (workoutsError) throw workoutsError;

      const processedWorkouts = workouts.map(workout => ({
        ...workout,
        exerciseSummary: workout.workout_exercises.reduce((acc, exercise) => {
          if (!acc[exercise.exercise_name]) {
            acc[exercise.exercise_name] = { sets: [] };
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
      Alert.alert('Error', 'Failed to fetch workouts');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutPress = (workout) => {
    navigation.navigate('WorkoutDetails', { workoutId: workout.id });
  };

  const handleDeleteWorkout = async (workoutId) => {
    try {
      Alert.alert(
        "Delete Workout",
        "Are you sure you want to delete this workout?",
        [
          { text: "Cancel", style: "cancel" },
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
              await fetchAllWorkouts();
              Alert.alert('Success', 'Workout deleted successfully');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting workout:', error);
      Alert.alert('Error', 'Failed to delete workout');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchAllWorkouts().finally(() => setRefreshing(false));
  }, []);

  const getIntensityColor = (intensity) => {
    switch (intensity) {
      case 'Superb': return '#4CAF50';
      case 'Good': return '#8B5CF6';
      case 'Average': return '#FFA726';
      case 'Bad': return '#EF5350';
      default: return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>All Workouts</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
          />
        }
      >
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
            <Text style={styles.emptyStateText}>No workouts found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E2E',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
});

export default AllWorkoutsScreen;
