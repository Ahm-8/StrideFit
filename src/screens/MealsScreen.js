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
  Dimensions,
  Button,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../services/supabaseClient';
import { format } from 'date-fns';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import openRouterApi from '../services/openRouterApi';
import { useScaledStyles } from '../hooks/useScaledStyles';

const CALORIE_GOAL = 2000; // This should come from user settings
const windowWidth = Dimensions.get('window').width;
const ProgressRing = ({ current, goal, size = 120, strokeWidth = 12 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressPercentage = Math.min((current / goal) * 100, 100);
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      {/* Background Circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#2E2E2E"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress Circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#8B5CF6"
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {/* Current Calories */}
      <SvgText
        x={size / 2}
        y={size / 2 - 10}
        fontSize="20"
        fill="#fff"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {Math.round(current)}
      </SvgText>
      {/* Goal Calories */}
      <SvgText
        x={size / 2}
        y={size / 2 + 10}
        fontSize="12"
        fill="#888"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        / {goal}
      </SvgText>
    </Svg>
  );
};

const MealsScreen = () => {
  const navigation = useNavigation();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [dailyStats, setDailyStats] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });
  const [calorieGoal, setCalorieGoal] = useState(CALORIE_GOAL);
  const [imageUri, setImageUri] = useState(null);
  const [mealData, setMealData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [noFoodDetected, setNoFoodDetected] = useState(false);
  const [achievements, setAchievements] = useState({
    calories: false,
    protein: false,
    carbs: false,
    fats: false,
    lastChecked: null
  });

  const styles = useScaledStyles(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    mainHeader: {
      padding: 20,
      paddingBottom: 10,
    },
    mainTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#fff',
    },
    statsCard: {
      backgroundColor: '#1E1E1E',
      borderRadius: 20,
      margin: 15,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    statsContent: {
      width: '100%',
    },
    nutritionInfo: {
      width: '100%',
    },
    nutritionRow: {
      marginBottom: 20,
    },
    macroRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    nutritionItem: {
      flex: 1,
      marginHorizontal: 5,
    },
    nutritionLabel: {
      color: '#888',
      fontSize: 14,
      marginBottom: 4,
    },
    nutritionValue: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    nutritionUnit: {
      color: '#888',
      fontSize: 16,
    },
    progressBar: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: '#2E2E2E',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
      marginTop: 10,
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
    mealsContainer: {
      padding: 15,
    },
    mealCard: {
      backgroundColor: '#1E1E1E',
      borderRadius: 15,
      marginBottom: 15,
      overflow: 'hidden',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
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
      backgroundColor: '#2E2E2E',
    },
    placeholderImage: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2E2E2E',
    },
    mealInfo: {
      flex: 1,
      marginLeft: 15,
      justifyContent: 'center',
    },
    mealTime: {
      color: '#888',
      fontSize: 14,
      fontWeight: '500',
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
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    addButton: {
      backgroundColor: '#8B5CF6',
      margin: 15,
      padding: 15,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    addButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 8,
    },
    image: {
      width: '100%',
      height: 200,
      marginVertical: 10,
      borderRadius: 10,
    },
    modalView: {
      margin: 20,
      backgroundColor: '#1E1E1E',
      borderRadius: 20,
      padding: 35,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      width: '90%',
      alignSelf: 'center',
      marginTop: 'auto',
      marginBottom: 'auto'
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 15,
      textAlign: 'center'
    },
    modalText: {
      color: '#FFFFFF',
      marginBottom: 10,
      textAlign: 'center'
    },
    testButton: {
      backgroundColor: '#FF6347',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginVertical: 10,
    },
    testButtonText: {
      color: '#fff',
      fontSize: 18,
    },
    modalContent: {
      maxHeight: 300,
      width: '100%',
    },
    modalButton: {
      backgroundColor: '#8B5CF6',
      padding: 10,
      borderRadius: 10,
      alignItems: 'center',
    },
    modalButtonText: {
      color: '#fff',
      fontSize: 16,
    },
    achievementCard: {
      backgroundColor: '#1E1E1E',
      borderRadius: 20,
      margin: 15,
      padding: 20,
      borderWidth: 1,
      borderColor: '#FFD700',
      shadowColor: '#FFD700',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    achievementHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    achievementTitle: {
      color: '#FFD700',
      fontSize: 20,
      fontWeight: 'bold',
      marginLeft: 10,
    },
    achievementList: {
      paddingLeft: 10,
    },
    achievementText: {
      color: '#fff',
      fontSize: 16,
      marginVertical: 5,
    },
  }));

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          setUser(user);
          await fetchTodaysMeals(user);
        }
      } catch (error) {
        console.error('Error initializing:', error);
      }
    };

    fetchInitialData();

    // Set up auth subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMounted) {
        if (session?.user) {
          setUser(session.user);
          await fetchTodaysMeals(session.user);
        } else {
          setUser(null);
          setMeals([]);
        }
      }
    });

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const fetchTodaysMeals = async (currentUser) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('meals')
        .select('*')  // Simplified select without meal_ingredients join
        .eq('user_id', currentUser.id)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setMeals(data);
        calculateDailyStats(data);
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
      Alert.alert('Error', 'Failed to fetch meals');
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyStats = (mealsData) => {
    const stats = mealsData.reduce((acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.protein || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      fats: acc.fats + (meal.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

    setDailyStats(stats);
    checkAchievements(stats);
  };

  const checkAchievements = (stats) => {
    const today = new Date().setHours(0, 0, 0, 0);
    
    // Reset achievements if it's a new day
    if (achievements.lastChecked && achievements.lastChecked < today) {
      setAchievements({
        calories: false,
        protein: false,
        carbs: false,
        fats: false,
        lastChecked: today
      });
      return;
    }
  
    // Check if goals are met
    setAchievements(prev => ({
      calories: stats.calories >= calorieGoal,
      protein: stats.protein >= 150,
      carbs: stats.carbs >= 250,
      fats: stats.fats >= 65,
      lastChecked: today
    }));
  };

  const formatTime = (dateString) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const handleShowMore = () => {
    navigation.navigate('AllMeals');
  };

  const handleMealPress = (mealId) => {
    navigation.navigate('MealDetails', { mealId });
  };

  const handleAddMeal = async () => {
    try {
      // Request both camera and media library permissions
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus.status !== 'granted' || libraryStatus.status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow camera and photo library access');
        return;
      }
  
      // Show action sheet for user to choose
      Alert.alert(
        'Add Meal Photo',
        'Choose a photo source',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              await takePhoto();
            },
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              await pickImage();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
      );
    } catch (error) {
      console.error('Error in handleAddMeal:', error);
      Alert.alert('Error', 'Failed to add meal');
    }
  };
  
  const takePhoto = async () => {
    try {
      setAnalyzing(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });
  
      await processImageResult(result);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setAnalyzing(false);
    }
  };
  
  const pickImage = async () => {
    try {
      setAnalyzing(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });
  
      await processImageResult(result);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setAnalyzing(false);
    }
  };
  
  const processImageResult = async (result) => {
    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      
      try {
        setAnalyzing(true);
        console.log('Sending image to API...');
        const data = await openRouterApi.analyzeImageWithOpenRouter(base64Image);
        
        if (data?.choices?.[0]?.message?.content) {
          const foodInfo = data.choices[0].message.content;
          
          // Check if response is "No Food in Image"
          if (typeof foodInfo === 'string' && foodInfo.includes('No Food in Image')) {
            setModalVisible(true);
            setMealData(null);
            setNoFoodDetected(true);
            setAnalyzing(false);
            return; // Early return without database save
          }
  
          const parsedFoodInfo = typeof foodInfo === 'object' ? foodInfo : parseFoodInfo(foodInfo);
          
          if (parsedFoodInfo) {
            // Only save to database if we have valid food data
            const savedMeal = await saveMealToDatabase(parsedFoodInfo, base64Image);
            if (savedMeal) {
              setMealData(savedMeal[0]);
              setModalVisible(true);
              setNoFoodDetected(false);
              // Refresh the meals list
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              await fetchTodaysMeals(currentUser);
            }
          } else {
            Alert.alert('Error', 'Could not parse food information');
          }
        }
      } catch (error) {
        console.error('Error in processing:', error);
        Alert.alert('Error', 'Failed to process: ' + error.message);
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setImageUri(null);
    setMealData(null);
  };

  const parseFoodInfo = (content) => {
    try {
      console.log('Content type:', typeof content);
      console.log('Raw content:', content);
  
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      console.log('Parsed data:', data);
  
      return {
        meal_name: data.meal_name || "Unknown Meal",
        calories: parseInt(data.calories) || 0,
        protein: parseFloat(data.protein) || 0,
        carbs: parseFloat(data.carbs) || 0,
        fats: parseFloat(data.fats) || 0
      };
    } catch (error) {
      console.error('Error parsing food info:', error);
      console.log('Failed content:', content);
      return null;
    }
  };

  const saveMealToDatabase = async (mealData, base64Image) => {
    try {
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        throw new Error('User not authenticated');
      }
  
      const { data: mealRecord, error: mealError } = await supabase
        .from('meals')
        .insert([{
          ...mealData,
          image_base64: base64Image,
          user_id: currentUser.id,
          created_at: new Date().toISOString()
        }])
        .select();
  
      if (mealError) {
        console.error('Meal error:', mealError);
        throw mealError;
      }
  
      // Refresh meals list after successful save
      await fetchTodaysMeals(currentUser);
      return mealRecord;
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Error', 'Failed to save meal: ' + error.message);
      throw error;
    }
  };

  const handleDeleteMeal = async (mealId) => {
    Alert.alert(
      "Delete Meal",
      "Are you sure you want to delete this meal?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
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
              await fetchTodaysMeals(user);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Main Header */}
        <View style={styles.mainHeader}>
          <Text style={styles.mainTitle}>Meals</Text>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsContent}>
            <View style={styles.nutritionInfo}>
              <View style={styles.nutritionRow}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                  <Text style={styles.nutritionValue}>
                    {Math.round(dailyStats.calories)}
                    <Text style={styles.nutritionUnit}> kcal</Text>
                  </Text>
                  <View style={[styles.progressBar, { backgroundColor: '#2E2E2E' }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${Math.min((dailyStats.calories / calorieGoal) * 100, 100)}%`,
                          backgroundColor: '#8B5CF6' 
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
              <View style={styles.macroRow}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                  <Text style={styles.nutritionValue}>
                    {Math.round(dailyStats.protein)}
                    <Text style={styles.nutritionUnit}> g</Text>
                  </Text>
                  <View style={[styles.progressBar, { backgroundColor: '#2E2E2E' }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${Math.min((dailyStats.protein / 150) * 100, 100)}%`,
                          backgroundColor: '#EF4444' 
                        }
                      ]} 
                    />
                  </View>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                  <Text style={styles.nutritionValue}>
                    {Math.round(dailyStats.carbs)}
                    <Text style={styles.nutritionUnit}> g</Text>
                  </Text>
                  <View style={[styles.progressBar, { backgroundColor: '#2E2E2E' }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${Math.min((dailyStats.carbs / 250) * 100, 100)}%`,
                          backgroundColor: '#10B981' 
                        }
                      ]} 
                    />
                  </View>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Fats</Text>
                  <Text style={styles.nutritionValue}>
                    {Math.round(dailyStats.fats)}
                    <Text style={styles.nutritionUnit}> g</Text>
                  </Text>
                  <View style={[styles.progressBar, { backgroundColor: '#2E2E2E' }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${Math.min((dailyStats.fats / 65) * 100, 100)}%`,
                          backgroundColor: '#F59E0B' 
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {Object.entries(achievements).some(([key, value]) => key !== 'lastChecked' && value) && (
          <View style={styles.achievementCard}>
            <View style={styles.achievementHeader}>
              <Ionicons name="trophy" size={24} color="#FFD700" />
              <Text style={styles.achievementTitle}>Goals Achieved!</Text>
            </View>
            <View style={styles.achievementList}>
              {achievements.calories && (
                <Text style={styles.achievementText}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" /> Calorie Goal
                </Text>
              )}
              {achievements.protein && (
                <Text style={styles.achievementText}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" /> Protein Goal
                </Text>
              )}
              {achievements.carbs && (
                <Text style={styles.achievementText}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" /> Carbs Goal
                </Text>
              )}
              {achievements.fats && (
                <Text style={styles.achievementText}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" /> Fats Goal
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Add Meal Button */}
        <TouchableOpacity onPress={handleAddMeal} style={styles.addButton}>
          <View style={styles.addButtonContent}>
            <Ionicons name="camera-outline" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add Meal Photo</Text>
          </View>
        </TouchableOpacity>

        {/* Today's Meals Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>
          <TouchableOpacity onPress={handleShowMore}>
            <Text style={styles.showMoreButton}>Show More</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : meals.length > 0 ? (
          <View style={styles.mealsContainer}>
            {meals.map((meal) => (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealContent}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealTime}>{formatTime(meal.created_at)}</Text>
                    <TouchableOpacity 
                      onPress={() => handleDeleteMeal(meal.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF4444" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleMealPress(meal.id)}
                    style={styles.mealDetails}
                  >
                    <View style={styles.mealImageContainer}>
                      {meal.image_base64 ? (
                        <Image
                          source={{ uri: meal.image_base64 }}
                          style={styles.mealImage}
                          resizeMode="cover"
                          // Add this to debug image loading
                          onError={(error) => console.error('Image loading error:', error)}
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
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#666" />
            <Text style={styles.emptyStateText}>No meals logged today</Text>
          </View>
        )}

        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.image} />
        )}

        {/* Modal to display meal data */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalView}>
            {analyzing ? (
              <>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.modalText}>Analyzing your meal...</Text>
              </>
            ) : noFoodDetected ? (
              <>
                <Text style={styles.modalTitle}>No Food Detected</Text>
                <Text style={styles.modalText}>
                  We couldn't detect any food in this image. Please try again with a clear photo of food.
                </Text>
                <TouchableOpacity 
                  style={styles.modalButton} 
                  onPress={handleCloseModal}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Meal Added Successfully</Text>
                {mealData && (
                  <ScrollView style={styles.modalContent}>
                    <Text style={styles.modalText}>Name: {mealData.meal_name}</Text>
                    <Text style={styles.modalText}>Calories: {mealData.calories} kcal</Text>
                    <Text style={styles.modalText}>Protein: {mealData.protein}g</Text>
                    <Text style={styles.modalText}>Carbs: {mealData.carbs}g</Text>
                    <Text style={styles.modalText}>Fats: {mealData.fats}g</Text>
                  </ScrollView>
                )}
                <TouchableOpacity 
                  style={styles.modalButton} 
                  onPress={handleCloseModal}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Modal>

        
      </ScrollView>
    </SafeAreaView>
  );
};

export default MealsScreen;
