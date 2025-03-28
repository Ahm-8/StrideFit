import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for stored session on app start
  useEffect(() => {
    checkUser();
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_IN') {
        setUser(session.user);
        
        // Check remember login setting before storing session
        const { data, error } = await supabase
          .from('user_details')
          .select('remember_login')
          .eq('user_id', session.user.id)
          .single();
        
        if (!error && data.remember_login) {
          await AsyncStorage.setItem('session', JSON.stringify(session));
        }
        
        await fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        await AsyncStorage.removeItem('session');
      }
      setLoading(false);
    });

    return () => {
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      // Check AsyncStorage for existing session
      const storedSession = await AsyncStorage.getItem('session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking stored session:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_details')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(profile || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  const checkUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_details')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return !!data; // Returns true if profile exists, false otherwise
    } catch (error) {
      console.error('Error checking user profile:', error);
      return false;
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('session');
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      checkUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};