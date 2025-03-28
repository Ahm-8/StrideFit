// components/ActivityCard.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { supabase } from '../services/supabaseClient';

const ActivityCard = () => {
  const [weeklyData, setWeeklyData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [0, 0, 0, 0, 0, 0, 0],
  });

  useEffect(() => {
    fetchWeeklyWorkouts();
  }, []);

  const fetchWeeklyWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get date range for the current week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); 
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('workouts')
        .select('intensity, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfWeek.toISOString());

      if (error) throw error;

      // Convert intensity to numerical value
      const intensityValues = {
        'Superb': 4,
        'Good': 3,
        'Average': 2,
        'Bad': 1
      };

      // Initialize daily intensity arrays
      const dailyIntensities = Array(7).fill([]);

      // Group workouts by day and calculate average intensity
      data.forEach(workout => {
        const date = new Date(workout.created_at);
        const dayIndex = date.getDay();
        const intensityValue = intensityValues[workout.intensity] || 0;
        dailyIntensities[dayIndex] = [...dailyIntensities[dayIndex], intensityValue];
      });

      // Calculate average intensity for each day
      const averageIntensities = dailyIntensities.map(dayIntensities => {
        if (dayIntensities.length === 0) return 0;
        const sum = dayIntensities.reduce((a, b) => a + b, 0);
        return Number((sum / dayIntensities.length).toFixed(1));
      });

      // Rotate arrays to start from Monday
      const rotatedData = [...averageIntensities.slice(1), averageIntensities[0]];

      setWeeklyData({
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: rotatedData,
      });

    } catch (error) {
      console.error('Error fetching weekly workouts:', error);
    }
  };

  const calculateWorkoutStats = () => {
    const daysWorkedOut = weeklyData.data.filter(value => value > 0).length;
    const averageIntensity = weeklyData.data.reduce((a, b) => a + b, 0) / daysWorkedOut || 0;
    
    let intensityLevel = 'No workouts';
    if (averageIntensity >= 3.5) intensityLevel = 'Superb';
    else if (averageIntensity >= 2.5) intensityLevel = 'Good';
    else if (averageIntensity >= 1.5) intensityLevel = 'Average';
    else if (averageIntensity > 0) intensityLevel = 'Bad';

    return { daysWorkedOut, intensityLevel };
  };

  const stats = calculateWorkoutStats();

  return (
    <View style={styles.activityContainer}>
      <View style={styles.chartContainer}>
        <BarChart
          data={{
            labels: weeklyData.labels,
            datasets: [
              {
                data: weeklyData.data,
              },
            ],
          }}
          width={Dimensions.get('window').width - 50}
          height={180}
          chartConfig={{
            backgroundColor: '#1c1c1e',
            backgroundGradientFrom: '#1c1c1e',
            backgroundGradientTo: '#1c1c1e',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            barPercentage: 0.7,
            propsForLabels: {
              fontSize: 12,
            },
          }}
          style={styles.chart}
          showValuesOnTopOfBars={true}
          fromZero={true}
          yAxisLabel=""
          yAxisSuffix=""
          withInnerLines={false}
          segments={4}
        />
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Days Active</Text>
          <Text style={styles.statValue}>{stats.daysWorkedOut}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Weekly Intensity</Text>
          <Text style={styles.statValue}>{stats.intensityLevel}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  activityContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#666666',
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ActivityCard;