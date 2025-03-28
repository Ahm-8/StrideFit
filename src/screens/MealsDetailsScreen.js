import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const MealDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { mealId } = route.params; // Get the mealId from the route parameters
  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMealDetails();
  }, [mealId]);

  const fetchMealDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('id', mealId)
        .single();

      if (error) throw error;

      setMeal(data);
    } catch (error) {
      console.error('Error fetching meal details:', error);
      Alert.alert('Error', 'Failed to fetch meal details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </SafeAreaView>
    );
  }

  if (!meal) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Meal not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{meal.meal_name}</Text>
      </View>
      {meal.image_url && (
        <Image source={{ uri: meal.image_url }} style={styles.image} />
      )}
      <View style={styles.details}>
        <Text style={styles.detailText}>Calories: {meal.calories} kcal</Text>
        <Text style={styles.detailText}>Protein: {meal.protein} g</Text>
        <Text style={styles.detailText}>Carbs: {meal.carbs} g</Text>
        <Text style={styles.detailText}>Fats: {meal.fats} g</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  details: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 15,
  },
  detailText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  errorText: {
    color: '#ff0000',
    fontSize: 18,
    textAlign: 'center',
  },
});

export default MealDetailsScreen;