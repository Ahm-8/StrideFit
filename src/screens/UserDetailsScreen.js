import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

const UserDetailsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    height: '',
    weight: '',
    goal: '',
    personal_bests: {
      bench_press: { weight: '', reps: '' },
      squat: { weight: '', reps: '' },
      deadlift: { weight: '', reps: '' }
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updatePersonalBest = (exercise, field, value) => {
    setFormData(prev => ({
      ...prev,
      personal_bests: {
        ...prev.personal_bests,
        [exercise]: {
          ...prev.personal_bests[exercise],
          [field]: value
        }
      }
    }));
  };

  const validateForm = () => {
    if (!formData.height || !formData.weight || !formData.goal) {
      setError('Please fill in all required fields');
      return false;
    }
    if (parseFloat(formData.height) < 100 || parseFloat(formData.height) > 250) {
      setError('Please enter a valid height (100-250 cm)');
      return false;
    }
    if (parseFloat(formData.weight) < 30 || parseFloat(formData.weight) > 250) {
      setError('Please enter a valid weight (30-250 kg)');
      return false;
    }
    return true;
  };

  const calculateCalorieGoal = (weight, height, goal) => {
    // BMR using Mifflin-St Jeor Equation
    const bmr = (10 * weight) + (6.25 * height) - (5 * 25) + 5; // Assuming age 25
    const activityFactor = 1.375; // Moderate exercise
    const tdee = bmr * activityFactor;
    
    return Math.round(goal === 'gain' ? tdee + 500 : tdee - 500);
  };

  const calculateDistanceGoal = (weight) => {
    return Math.max(3, Math.round((weight * 0.033) * 10) / 10); // Minimum 3km
  };

  const handleSubmit = async () => {
    try {
      setError('');
      if (!validateForm()) return;
      
      setLoading(true);
      const weight = parseFloat(formData.weight);
      const height = parseFloat(formData.height);
      
      const calorieGoal = calculateCalorieGoal(weight, height, formData.goal);
      const distanceGoal = calculateDistanceGoal(weight);

      // Sanitize personal bests to remove empty values
      const sanitizedPBs = {};
      Object.entries(formData.personal_bests).forEach(([exercise, data]) => {
        if (data.weight && data.reps) {
          sanitizedPBs[exercise] = {
            weight: parseFloat(data.weight),
            reps: parseInt(data.reps)
          };
        }
      });

      const userDetails = {
        user_id: user.id,
        height: height,
        weight: weight,
        fitness_goal: formData.goal,
        personal_bests: Object.keys(sanitizedPBs).length > 0 ? sanitizedPBs : null,
        calorie_goal: calorieGoal,
        distance_goal: distanceGoal,
        created_at: new Date().toISOString()
      };

      // First try to get existing profile
      const { data: existingProfile } = await supabase
        .from('user_details')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_details')
          .update(userDetails)
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // Insert new profile
        const { error: insertError } = await supabase
          .from('user_details')
          .insert([userDetails]);
        error = insertError;
      }

      if (error) throw error;
      navigation.navigate('Main')


    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to save user details');
    } finally {
      setLoading(false);
    }
  };

  const renderExerciseInputs = (exercise, label) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.exerciseInputs}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          value={formData.personal_bests[exercise].weight}
          onChangeText={(text) => updatePersonalBest(exercise, 'weight', text)}
          keyboardType="numeric"
          placeholder="Weight (kg)"
          placeholderTextColor="#666"
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          value={formData.personal_bests[exercise].reps}
          onChangeText={(text) => updatePersonalBest(exercise, 'reps', text)}
          keyboardType="numeric"
          placeholder="Reps"
          placeholderTextColor="#666"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Complete Your Profile</Text>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            value={formData.height}
            onChangeText={(text) => setFormData(prev => ({ ...prev, height: text }))}
            keyboardType="numeric"
            placeholder="Enter height in cm"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={formData.weight}
            onChangeText={(text) => setFormData(prev => ({ ...prev, weight: text }))}
            keyboardType="numeric"
            placeholder="Enter weight in kg"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Your Goal</Text>
          <View style={styles.goalButtons}>
            <TouchableOpacity
              style={[styles.goalButton, formData.goal === 'gain' && styles.goalButtonActive]}
              onPress={() => setFormData(prev => ({ ...prev, goal: 'gain' }))}
            >
              <Text style={styles.goalButtonText}>Gain Muscle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.goalButton, formData.goal === 'lose' && styles.goalButtonActive]}
              onPress={() => setFormData(prev => ({ ...prev, goal: 'lose' }))}
            >
              <Text style={styles.goalButtonText}>Lose Fat</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Personal Bests (Optional)</Text>
        
        {renderExerciseInputs('bench_press', 'Bench Press')}
        {renderExerciseInputs('squat', 'Squat')}
        {renderExerciseInputs('deadlift', 'Deadlift')}

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Setting up...' : 'Complete Setup'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
  },
  goalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  goalButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  goalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 15,
  },
  exerciseInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
    marginBottom: 50,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FF000020',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF0000',
    textAlign: 'center',
    fontSize: 14,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
});

export default UserDetailsScreen;