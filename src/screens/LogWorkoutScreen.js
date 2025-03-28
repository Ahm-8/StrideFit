import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const LogWorkoutScreen = ({ navigation }) => {
    const { user } = useAuth();

    const [workoutName, setWorkoutName] = useState('');
    const [intensity, setIntensity] = useState('');
    const [exercises, setExercises] = useState([]);
    const [exerciseName, setExerciseName] = useState('');
    const [currentSets, setCurrentSets] = useState([]);
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [error, setError] = useState('');

    const validateNumber = (value) => {
        const num = parseInt(value, 10);
        return !isNaN(num) && num > 0;
    };

    const addSet = () => {
        if (!weight || !reps) {
            setError('Please fill weight and reps');
            return;
        }

        if (!validateNumber(weight) || !validateNumber(reps)) {
            setError('Weight and reps must be valid numbers');
            return;
        }

        const newSet = {
            weight: parseFloat(weight),
            reps: parseInt(reps, 10)
        };

        setCurrentSets([...currentSets, newSet]);
        setWeight('');
        setReps('');
        setError('');
    };

    const addExercise = async () => {
        if (!exerciseName || currentSets.length === 0) {
            setError('Please enter exercise name and add at least one set');
            return;
        }

        try {
            // Get user's personal bests and recent performance
            const { data: userDetails, error: userError } = await supabase
                .from('user_details')
                .select('personal_bests')
                .eq('user_id', user.id)
                .single();

            if (userError) throw userError;

            // Get recent workouts for this exercise
            const { data: recentWorkouts, error: recentError } = await supabase
                .from('workout_exercises')
                .select('weight, reps')
                .eq('exercise_name', exerciseName)
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentError) throw recentError;

            // Calculate current performance
            const currentPerformance = currentSets.reduce((best, set) => {
                if (set.weight * set.reps > best.weight * best.reps) {
                    return set;
                }
                return best;
            }, currentSets[0]);

            // Calculate recent average performance
            const recentAvg = recentWorkouts.length > 0 ? {
                weight: recentWorkouts.reduce((sum, w) => sum + w.weight, 0) / recentWorkouts.length,
                reps: Math.round(recentWorkouts.reduce((sum, w) => sum + w.reps, 0) / recentWorkouts.length)
            } : null;

            // Get personal best
            const exerciseKey = exerciseName.toLowerCase().replace(/\s+/g, '_');
            const personalBest = userDetails?.personal_bests?.[exerciseKey];

            // Determine intensity
            let intensity;
            if (!recentAvg) {
                // First time or no recent workouts
                if (personalBest) {
                    if (currentPerformance.weight >= personalBest.weight * 0.9 && 
                        currentPerformance.reps >= personalBest.reps * 0.9) {
                        intensity = 'Superb';
                    } else if (currentPerformance.weight >= personalBest.weight * 0.8 && 
                             currentPerformance.reps >= personalBest.reps * 0.8) {
                        intensity = 'Good';
                    } else if (currentPerformance.weight >= personalBest.weight * 0.7 && 
                             currentPerformance.reps >= personalBest.reps * 0.7) {
                        intensity = 'Average';
                    } else {
                        intensity = 'Bad';
                    }
                } else {
                    intensity = 'Good'; // Default for first time
                }
            } else {
                // Compare with recent average
                if (currentPerformance.weight > recentAvg.weight && 
                    currentPerformance.reps >= recentAvg.reps) {
                    intensity = 'Superb';
                } else if (currentPerformance.weight >= recentAvg.weight * 0.95) {
                    intensity = 'Good';
                } else if (currentPerformance.weight >= recentAvg.weight * 0.9) {
                    intensity = 'Average';
                } else {
                    intensity = 'Bad';
                }
            }

            const newExercise = {
                exerciseName,
                sets: currentSets,
                intensity,
                totalVolume: currentSets.reduce((sum, set) => sum + (set.weight * set.reps), 0)
            };

            setExercises([...exercises, newExercise]);
            setExerciseName('');
            setCurrentSets([]);
            setWeight('');
            setReps('');
            setError('');

        } catch (error) {
            console.error('Error adding exercise:', error);
            setError('Failed to add exercise');
        }
    };

    const logWorkout = async () => {
        if (exercises.length === 0) {
            setError('Please add at least one exercise');
            return;
        }

        try {
            // Calculate overall workout intensity based on exercises
            const intensityScores = {
                'Superb': 4,
                'Good': 3,
                'Average': 2,
                'Bad': 1
            };
            
            const overallIntensity = exercises.reduce((acc, exercise) => 
                acc + intensityScores[exercise.intensity], 0) / exercises.length;
            
            let workoutIntensity;
            if (overallIntensity >= 3.5) workoutIntensity = 'Superb';
            else if (overallIntensity >= 2.5) workoutIntensity = 'Good';
            else if (overallIntensity >= 1.5) workoutIntensity = 'Average';
            else workoutIntensity = 'Bad';

            // Insert workout with intensity
            const { data: workoutData, error: workoutError } = await supabase
                .from('workouts')
                .insert([{
                    user_id: user.id,
                    name: workoutName || 'Workout',
                    created_at: new Date().toISOString(),
                    intensity: workoutIntensity // Add workout intensity
                }])
                .select()
                .single();

            if (workoutError) throw workoutError;

            // Prepare exercise sets with intensity
            const exerciseInserts = exercises.map((exercise) => {
                return exercise.sets.map((set, setIndex) => ({
                    workout_id: workoutData.id,
                    exercise_name: exercise.exerciseName,
                    set_number: setIndex + 1,
                    weight: set.weight,
                    reps: set.reps,
                    intensity: exercise.intensity, // Add exercise intensity
                    created_at: new Date().toISOString()
                }));
            }).flat();

            // Insert all exercise sets
            const { error: exerciseError } = await supabase
                .from('workout_exercises')
                .insert(exerciseInserts);

            if (exerciseError) throw exerciseError;

            navigation.goBack();
        } catch (error) {
            console.error('Error logging workout:', error);
            setError('Failed to log workout');
        }
    };

    const removeSet = (indexToRemove) => {
        setCurrentSets(currentSets.filter((_, index) => index !== indexToRemove));
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Log Workout</Text>
                    <View style={{ width: 24 }} /> 
                </View>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Workout Details</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Workout Name"
                        placeholderTextColor="#666"
                        value={workoutName}
                        onChangeText={setWorkoutName}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Add Exercise</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Exercise Name"
                        placeholderTextColor="#666"
                        value={exerciseName}
                        onChangeText={setExerciseName}
                    />
                    
                    <View style={styles.setInputContainer}>
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="Weight (kg)"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={weight}
                            onChangeText={setWeight}
                        />
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="Reps"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={reps}
                            onChangeText={setReps}
                        />
                    </View>

                    <TouchableOpacity style={styles.addButton} onPress={addSet}>
                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        <Text style={styles.addButtonText}>Add Set</Text>
                    </TouchableOpacity>

                    {currentSets.length > 0 && (
                        <View style={styles.setsContainer}>
                            <Text style={styles.subsectionTitle}>Current Sets</Text>
                            {currentSets.map((set, index) => (
                                <View key={index} style={styles.setItem}>
                                    <View style={styles.setInfo}>
                                        <Text style={styles.setText}>Set {index + 1}</Text>
                                        <Text style={styles.setText}>
                                            {set.weight}kg × {set.reps}
                                        </Text>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => removeSet(index)}
                                        style={styles.deleteButton}
                                    >
                                        <Ionicons name="close-circle-outline" size={24} color="#ff4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {currentSets.length > 0 && (
                        <TouchableOpacity style={styles.primaryButton} onPress={addExercise}>
                            <Text style={styles.primaryButtonText}>Save Exercise</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {exercises.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Exercises</Text>
                        {exercises.map((exercise, index) => (
                            <View key={index} style={styles.exerciseItem}>
                                <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
                                <Text style={[styles.intensityText, styles[`intensity${exercise.intensity}`]]}>
                                    {exercise.intensity}
                                </Text>
                                {exercise.sets.map((set, setIndex) => (
                                    <View key={setIndex} style={styles.setItem}>
                                        <Text style={styles.setText}>
                                            Set {setIndex + 1}: {set.weight}kg × {set.reps}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                )}

                {exercises.length > 0 && (
                    <TouchableOpacity style={styles.finishButton} onPress={logWorkout}>
                        <Text style={styles.finishButtonText}>Complete Workout</Text>
                    </TouchableOpacity>
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
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    errorContainer: {
        backgroundColor: '#ff000030',
        padding: 10,
        marginHorizontal: 20,
        borderRadius: 10,
        marginBottom: 15,
    },
    errorText: {
        color: '#ff0000',
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#1C1C1E',
        borderRadius: 15,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
    },
    subsectionTitle: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#2C2C2E',
        borderRadius: 10,
        padding: 15,
        color: '#fff',
        marginBottom: 15,
    },
    intensityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    intensityButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#2C2C2E',
    },
    intensityButtonActive: {
        backgroundColor: '#4CAF50',
    },
    intensityButtonText: {
        color: '#666',
    },
    intensityButtonTextActive: {
        color: '#fff',
    },
    setInputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2C2C2E',
        padding: 12,
        borderRadius: 10,
        marginBottom: 15,
    },
    addButtonText: {
        color: '#fff',
        marginLeft: 8,
    },
    setsContainer: {
        marginTop: 10,
    },
    setItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    setInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flex: 1,
    },
    setText: {
        color: '#fff',
    },
    deleteButton: {
        marginLeft: 10,
    },
    exerciseItem: {
        marginBottom: 20,
    },
    exerciseTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    primaryButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 15,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    finishButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        marginHorizontal: 20,
        marginBottom: 30,
    },
    finishButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    intensityText: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 5,
    },
    intensitySuperb: {
        color: '#4CAF50',
    },
    intensityGood: {
        color: '#8B5CF6',
    },
    intensityAverage: {
        color: '#FFA726',
    },
    intensityBad: {
        color: '#EF5350',
    },
});

export default LogWorkoutScreen;
