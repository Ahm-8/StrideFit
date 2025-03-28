import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../services/supabaseClient'; // Ensure this path is correct

const HealthDetailsScreen = () => {
  const [healthInfo, setHealthInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserHealthInfo();
  }, []);

  const fetchUserHealthInfo = async () => {
    const { data, error } = await supabase
      .from('users') // Adjust table name as needed
      .select('health_info, goals')
      .eq('id', supabase.auth.user().id)
      .single();

    if (error) {
      Alert.alert('Error', 'Failed to fetch health information');
      setLoading(false);
    } else {
      setHealthInfo(data);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Details</Text>
      {healthInfo ? (
        <>
          <Text style={styles.label}>Name: {healthInfo.health_info.name}</Text>
          <Text style={styles.label}>Age: {healthInfo.health_info.age}</Text>
          <Text style={styles.label}>Height: {healthInfo.health_info.height} cm</Text>
          <Text style={styles.label}>Weight: {healthInfo.health_info.weight} kg</Text>
          <Text style={styles.label}>Daily Steps Goal: {healthInfo.goals.daily_steps_goal}</Text>
          <Text style={styles.label}>Daily Calorie Limit: {healthInfo.goals.daily_calorie_limit}</Text>
          {/* Add more health details as needed */}
        </>
      ) : (
        <Text style={styles.noDataText}>No health information available.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginVertical: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default HealthDetailsScreen;