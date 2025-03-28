import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

const AllMealsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async (loadMore = false) => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const currentPage = loadMore ? page + 1 : 1;
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (loadMore) {
        setMeals([...meals, ...data]);
        setPage(currentPage);
      } else {
        setMeals(data);
      }

      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching meals:', error);
      Alert.alert('Error', 'Failed to fetch meals');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeal = async (mealId) => {
    Alert.alert(
      "Delete Meal",
      "Are you sure you want to delete this meal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('meals')
                .delete()
                .eq('id', mealId);

              if (error) throw error;
              
              // Refresh meals list
              await fetchMeals();
            } catch (error) {
              console.error('Error deleting meal:', error);
              Alert.alert('Error', 'Failed to delete meal');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const formatTime = (dateString) => {
    return format(new Date(dateString), 'h:mm a');
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
        <Text style={styles.title}>All Meals</Text>
        <View style={styles.backButton} />
      </View>
      
      <ScrollView>
        <View style={styles.mealsContainer}>
          {loading && page === 1 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          ) : meals.length > 0 ? (
            meals.map((meal) => (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealContent}>
                  <View style={styles.mealHeader}>
                    <View style={styles.mealDateContainer}>
                      <Text style={styles.mealDate}>{formatDate(meal.created_at)}</Text>
                      <Text style={styles.mealTime}>{formatTime(meal.created_at)}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleDeleteMeal(meal.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.mealDetails}>
                    <View style={styles.mealImageContainer}>
                      {meal.image_base64 ? (
                        <Image
                          source={{ uri: meal.image_base64 }}
                          style={styles.mealImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.placeholderImage}>
                          <Ionicons name="restaurant-outline" size={24} color="#666" />
                        </View>
                      )}
                    </View>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>{meal.meal_name}</Text>
                      <Text style={styles.mealCalories}>{Math.round(meal.calories)} kcal</Text>
                      <View style={styles.macroContainer}>
                        <View style={styles.macroItem}>
                          <Text style={styles.macroLabel}>Protein</Text>
                          <Text style={styles.macroValue}>{Math.round(meal.protein)}g</Text>
                        </View>
                        <View style={styles.macroItem}>
                          <Text style={styles.macroLabel}>Carbs</Text>
                          <Text style={styles.macroValue}>{Math.round(meal.carbs)}g</Text>
                        </View>
                        <View style={styles.macroItem}>
                          <Text style={styles.macroLabel}>Fats</Text>
                          <Text style={styles.macroValue}>{Math.round(meal.fats)}g</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color="#666" />
              <Text style={styles.emptyStateText}>No meals logged yet</Text>
            </View>
          )}
          
          {hasMore && !loading && (
            <TouchableOpacity 
              style={styles.loadMoreButton}
              onPress={() => fetchMeals(true)}
            >
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          )}
          
          {loading && page > 1 && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          )}
        </View>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  mealsContainer: {
    padding: 15,
  },
  mealCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  mealContent: {
    padding: 15,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mealDateContainer: {
    flexDirection: 'column',
  },
  mealDate: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  mealTime: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2E2E2E',
  },
  mealDetails: {
    flexDirection: 'row',
  },
  mealImageContainer: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2E2E2E',
  },
  mealImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
    marginLeft: 15,
  },
  mealName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mealCalories: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  macroContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2E2E2E',
    borderRadius: 10,
    padding: 10,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },
  macroValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreButton: {
    backgroundColor: '#2E2E2E',
    padding: 15,
    borderRadius: 10,
    margin: 15,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#8B5CF6',
    fontSize: 16,
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
});

export default AllMealsScreen;
