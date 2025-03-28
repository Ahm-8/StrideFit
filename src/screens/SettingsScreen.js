import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  Switch 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFontSize } from '../context/FontSizeContext';


const SettingsScreen = () => {
  const navigation = useNavigation();
  const { signOut, user } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalValue, setModalValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(true);
  const { fontSize, setFontSize } = useFontSize();

  useEffect(() => {
    fetchUserDetails();
    fetchRememberLoginSetting();
  }, []);

  // Modify the fetchUserDetails function to include font size
  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_details')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserDetails(data);
      setFontSize(data.font_size || 'normal'); // Set default to 'normal' if not set
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  const fetchRememberLoginSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('user_details')
        .select('remember_login')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setRememberLogin(data.remember_login);
    } catch (error) {
      console.error('Error fetching remember login setting:', error);
    }
  };

  const handleOpenModal = (type, currentValue) => {
    setModalType(type);
    setModalValue(String(currentValue));
    setModalVisible(true);
  };

  const handleSaveValue = async () => {
    try {
      setLoading(true);
      const updates = {};
      
      switch (modalType) {
        case 'weight':
          updates.weight = parseFloat(modalValue);
          break;
        case 'height':
          updates.height = parseFloat(modalValue);
          break;
        case 'calorieGoal':
          updates.calorie_goal = parseInt(modalValue);
          break;
        case 'distanceGoal':
          updates.distance_goal = parseFloat(modalValue);
          break;
        case 'fitnessGoal':
          updates.fitness_goal = modalValue;
          break;
      }

      const { error } = await supabase
        .from('user_details')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchUserDetails();
      setModalVisible(false);
      Alert.alert('Success', 'Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete all your data. This action cannot be undone. Are you sure?",
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

              // First, delete user data from all tables
              const deletions = await Promise.all([
                supabase.from('meals').delete().eq('user_id', user.id),
                supabase.from('workouts').delete().eq('user_id', user.id),
                supabase.from('user_details').delete().eq('user_id', user.id)
              ]);

              const errors = deletions.map(d => d.error).filter(Boolean);
              if (errors.length > 0) {
                console.error('Error deleting user data:', errors);
                throw new Error('Failed to delete user data');
              }

              // Then sign out the user
              const { error: signOutError } = await supabase.auth.signOut();
              if (signOutError) throw signOutError;

              // Finally, try to delete the auth account
              // Note: This might fail due to permissions, but user data is already cleaned
              try {
                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
                const { error: deleteAuthError } = await supabase.rpc('delete_user', {
                  user_id: user.id
                });
                if (deleteAuthError) console.warn('Could not delete auth account:', deleteAuthError);
              } catch (authError) {
                console.warn('Auth deletion failed:', authError);
              }

              // Even if auth deletion fails, sign out the user
              await signOut();
              
            } catch (error) {
              console.error('Error during account deletion:', error);
              Alert.alert(
                'Error',
                'Failed to completely delete account. Please contact support.'
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRememberLoginToggle = async (value) => {
    try {
      setRememberLogin(value);
      const { error } = await supabase
        .from('user_details')
        .update({ remember_login: value })
        .eq('user_id', user.id);

      if (error) throw error;
      
      // If turning off, clear stored session
      if (!value) {
        await AsyncStorage.removeItem('session');
      }
    } catch (error) {
      console.error('Error updating remember login setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleFontSizeChange = async (size) => {
    try {
      await AsyncStorage.setItem('fontSize', size);
      setFontSize(size);
      // Update the user_details table with the new font size
      const { error } = await supabase
        .from('user_details')
        .update({ font_size: size })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating font size:', error);
      Alert.alert('Error', 'Failed to update font size');
    }
  };

  const renderSettingsItem = (icon, title, value, type) => (
    <TouchableOpacity 
      style={styles.settingsItem} 
      onPress={() => handleOpenModal(type, value)}
    >
      <View style={styles.settingsItemLeft}>
        <Ionicons name={icon} size={24} color="#8B5CF6" />
        <Text style={styles.settingsItemTitle}>{title}</Text>
      </View>
      <View style={styles.settingsItemRight}>
        <Text style={styles.settingsItemValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      <View style={styles.profileSection}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle-outline" size={60} color="#8B5CF6" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.email?.split('@')[0]}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <ScrollView style={styles.settingsContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            {renderSettingsItem('body-outline', 'Weight', `${userDetails?.weight} kg`, 'weight')}
            {renderSettingsItem('resize-outline', 'Height', `${userDetails?.height} cm`, 'height')}
            {renderSettingsItem('fitness-outline', 'Fitness Goal', userDetails?.fitness_goal, 'fitnessGoal')}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Goals</Text>
            {renderSettingsItem('flame-outline', 'Daily Calories', userDetails?.calorie_goal, 'calorieGoal')}
            {renderSettingsItem('walk-outline', 'Daily Distance', `${userDetails?.distance_goal} km`, 'distanceGoal')}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            <View style={styles.settingsItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="key-outline" size={24} color="#8B5CF6" />
                <Text style={styles.settingLabel}>Remember Login</Text>
              </View>
              <Switch
                value={rememberLogin}
                onValueChange={handleRememberLoginToggle}
                trackColor={{ false: '#767577', true: '#8B5CF6' }}
                thumbColor={rememberLogin ? '#fff' : '#f4f3f4'}
              />
            </View>
            <View style={styles.settingsItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="text-outline" size={24} color="#8B5CF6" />
                <Text style={styles.settingLabel}>Font Size</Text>
              </View>
              <View style={styles.fontSizeSelector}>
                <TouchableOpacity
                  style={[styles.fontSizeButton, fontSize === 'small' && styles.fontSizeButtonActive]}
                  onPress={() => handleFontSizeChange('small')}
                >
                  <Text style={[styles.fontSizeButtonText, fontSize === 'small' && styles.fontSizeButtonTextActive]}>A</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.fontSizeButton, fontSize === 'normal' && styles.fontSizeButtonActive]}
                  onPress={() => handleFontSizeChange('normal')}
                >
                  <Text style={[styles.fontSizeButtonText, fontSize === 'normal' && styles.fontSizeButtonTextActive]}>AA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.fontSizeButton, fontSize === 'large' && styles.fontSizeButtonActive]}
                  onPress={() => handleFontSizeChange('large')}
                >
                  <Text style={[styles.fontSizeButtonText, fontSize === 'large' && styles.fontSizeButtonTextActive]}>AAA</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={24} color="#FF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.dangerZoneTitle]}>Danger Zone</Text>
            <TouchableOpacity 
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={24} color="#FF4444" />
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'fitnessGoal' ? 'Select Fitness Goal' : 'Enter New Value'}
            </Text>
            
            {modalType === 'fitnessGoal' ? (
              <View style={styles.goalButtons}>
                <TouchableOpacity
                  style={[styles.goalButton, modalValue === 'gain' && styles.goalButtonActive]}
                  onPress={() => setModalValue('gain')}
                >
                  <Text style={styles.goalButtonText}>Gain Muscle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.goalButton, modalValue === 'lose' && styles.goalButtonActive]}
                  onPress={() => setModalValue('lose')}
                >
                  <Text style={styles.goalButtonText}>Lose Fat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TextInput
                style={styles.modalInput}
                value={modalValue}
                onChangeText={setModalValue}
                keyboardType="numeric"
                placeholder="Enter new value"
                placeholderTextColor="#666"
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveValue}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    padding: 20,
  },
  settingsContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginLeft: 20,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: '#fff',
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemTitle: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemValue: {
    color: '#666',
    marginRight: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    marginHorizontal: 20,
    borderRadius: 12,
  },
  signOutText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#331111',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  deleteAccountText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#2A2A2A',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  goalButtons: {
    marginBottom: 20,
  },
  goalButton: {
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  goalButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  goalButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerZoneTitle: {
    color: '#FF4444',
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E2E',
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#666',
    fontSize: 14,
  },
  fontSizeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 4,
  },
  fontSizeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  fontSizeButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  fontSizeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  fontSizeButtonTextActive: {
    color: '#fff',
  },
});
export default SettingsScreen;