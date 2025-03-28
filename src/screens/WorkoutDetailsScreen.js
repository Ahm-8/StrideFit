import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';
import { format } from 'date-fns';

const WorkoutDetailsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedWorkout, setEditedWorkout] = useState(null);
  const [editedExercises, setEditedExercises] = useState([]);

  useEffect(() => {
    fetchWorkoutDetails();
  }, [workoutId]);

  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch workout details
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .maybeSingle(); // Use maybeSingle() instead of single()

      if (workoutError) throw workoutError;
      if (!workoutData) {
        setWorkout(null);
        return;
      }

      // Fetch exercises for this workout
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          exercise_name,
          set_number,
          weight,
          reps,
          intensity,
          created_at
        `)
        .eq('workout_id', workoutId)
        .order('set_number', { ascending: true });

      if (exercisesError) throw exercisesError;

      // Group exercises by name to show sets together
      const groupedExercises = exercisesData.reduce((acc, exercise) => {
        if (!acc[exercise.exercise_name]) {
          acc[exercise.exercise_name] = [];
        }
        acc[exercise.exercise_name].push(exercise);
        return acc;
      }, {});

      setWorkout(workoutData);
      setExercises(Object.entries(groupedExercises).map(([name, sets]) => ({
        name,
        sets
      })));
    } catch (error) {
      console.error('Error fetching workout details:', error);
      Alert.alert('Error', 'Failed to fetch workout details');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPress = () => {
    setIsEditing(true);
    setEditedWorkout({ ...workout });
    setEditedExercises([...exercises]);
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      
      // Update workout details
      const { error: workoutError } = await supabase
        .from('workouts')
        .update({
          name: editedWorkout.name,
          intensity: editedWorkout.intensity
        })
        .eq('id', workoutId);

      if (workoutError) throw workoutError;

      // Update exercises
      for (const exercise of editedExercises) {
        for (const set of exercise.sets) {
          const { error: exerciseError } = await supabase
            .from('workout_exercises')
            .update({
              weight: set.weight,
              reps: set.reps,
              intensity: exercise.sets[0].intensity
            })
            .eq('id', set.id);

          if (exerciseError) throw exerciseError;
        }
      }

      setIsEditing(false);
      await fetchWorkoutDetails();
      Alert.alert('Success', 'Workout updated successfully');
    } catch (error) {
      console.error('Error updating workout:', error);
      Alert.alert('Error', 'Failed to update workout');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedWorkout(null);
    setEditedExercises([]);
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

  const calculateVolumeForExercise = (sets) => {
    return sets.reduce((total, set) => total + (set.weight * set.reps), 0);
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
        <Text style={styles.title}>Workout Details</Text>
        {!isEditing ? (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={handleEditPress}
          >
            <Ionicons name="create-outline" size={24} color="#8B5CF6" />
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity 
              style={styles.editActionButton}
              onPress={handleSaveEdit}
            >
              <Ionicons name="checkmark" size={24} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.editActionButton}
              onPress={handleCancelEdit}
            >
              <Ionicons name="close" size={24} color="#EF5350" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : workout ? (
        <ScrollView style={styles.content}>
          <View style={styles.workoutHeader}>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editedWorkout.name}
                onChangeText={(text) => setEditedWorkout(prev => ({ ...prev, name: text }))}
                placeholder="Workout Name"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.workoutName}>{workout.name}</Text>
            )}
            <Text style={styles.workoutDate}>
              {format(new Date(workout.created_at), 'EEEE, MMMM d, yyyy')}
            </Text>
            <Text style={styles.workoutTime}>
              {format(new Date(workout.created_at), 'h:mm a')}
            </Text>
            <View style={[
              styles.intensityBadge,
              { backgroundColor: `${getIntensityColor(workout.intensity)}20` }
            ]}>
              <Ionicons 
                name="fitness" 
                size={16} 
                color={getIntensityColor(workout.intensity)} 
              />
              <Text style={[
                styles.intensityText,
                { color: getIntensityColor(workout.intensity) }
              ]}>
                {workout.intensity} Workout
              </Text>
            </View>
          </View>

          <View style={styles.exercisesContainer}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            {exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseHeaderLeft}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <View style={[
                      styles.intensityBadge,
                      { backgroundColor: `${getIntensityColor(exercise.sets[0].intensity)}20` }
                    ]}>
                      <Ionicons 
                        name="flash" 
                        size={14} 
                        color={getIntensityColor(exercise.sets[0].intensity)} 
                      />
                      <Text style={[
                        styles.intensityText,
                        { color: getIntensityColor(exercise.sets[0].intensity) }
                      ]}>
                        {exercise.sets[0].intensity}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.volumeText}>
                    Volume: {calculateVolumeForExercise(exercise.sets)}kg
                  </Text>
                </View>
                <View style={styles.setsContainer}>
                  <View style={styles.setHeader}>
                    <Text style={styles.setHeaderText}>Set</Text>
                    <Text style={styles.setHeaderText}>Weight</Text>
                    <Text style={styles.setHeaderText}>Reps</Text>
                  </View>
                  {exercise.sets.map((set, setIndex) => (
                    <View key={setIndex} style={styles.setRow}>
                      <Text style={styles.setText}>{set.set_number}</Text>
                      {isEditing ? (
                        <>
                          <TextInput
                            style={styles.editSetInput}
                            value={String(set.weight)}
                            onChangeText={(text) => {
                              const newExercises = [...editedExercises];
                              newExercises[index].sets[setIndex].weight = Number(text);
                              setEditedExercises(newExercises);
                            }}
                            keyboardType="numeric"
                            placeholder="Weight"
                            placeholderTextColor="#666"
                          />
                          <TextInput
                            style={styles.editSetInput}
                            value={String(set.reps)}
                            onChangeText={(text) => {
                              const newExercises = [...editedExercises];
                              newExercises[index].sets[setIndex].reps = Number(text);
                              setEditedExercises(newExercises);
                            }}
                            keyboardType="numeric"
                            placeholder="Reps"
                            placeholderTextColor="#666"
                          />
                        </>
                      ) : (
                        <>
                          <Text style={styles.setText}>{set.weight}kg</Text>
                          <Text style={styles.setText}>{set.reps}</Text>
                        </>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={48} color="#666" />
          <Text style={styles.emptyStateText}>Workout not found</Text>
        </View>
      )}
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
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editActionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  workoutHeader: {
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    margin: 15,
  },
  editInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#2E2E2E',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  workoutDate: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  workoutTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  intensityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  intensityText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  exercisesContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    marginLeft: 5,
  },
  exerciseCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  exerciseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 10,
  },
  volumeText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  setsContainer: {
    backgroundColor: '#2E2E2E',
    borderRadius: 10,
    padding: 10,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  setHeaderText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    width: 60,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  setText: {
    color: '#fff',
    fontSize: 16,
    width: 60,
    textAlign: 'center',
  },
  editSetInput: {
    color: '#fff',
    fontSize: 16,
    width: 60,
    textAlign: 'center',
    backgroundColor: '#404040',
    borderRadius: 8,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
  },
});

export default WorkoutDetailsScreen;
