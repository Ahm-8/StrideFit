import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  NetInfo
} from 'react-native';
import { useAuth } from '../context/AuthContext'; // Adjust the import path as needed

const AuthScreen = () => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);

  // Add network connectivity check
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const state = await NetInfo.fetch();
        setIsConnected(state.isConnected);
      } catch (error) {
        console.error('Network check error:', error);
      }
    };

    // checkConnectivity();
    // //const unsubscribe = NetInfo.addEventListener(state => {
    //   //setIsConnected(state.isConnected);
    // });

    //return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (!isConnected) {
      setError('No internet connection. Please check your network settings.');
      return;
    }

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          if (isSignUp) {
            await signUp(email, password);
            setVerificationSent(true); // Set verification status
            setError(''); // Clear any existing errors
          } else {
            await signIn(email, password);
          }
          success = true;
        } catch (err) {
          retryCount++;
          if (retryCount === maxRetries) throw err;
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      let errorMessage = 'Authentication failed';
      
      if (err.message.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (err.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password';
      } else if (err.message.includes('Email already exists')) {
        errorMessage = 'This email is already registered';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Update the button to show loading state
  const renderButton = () => (
    <TouchableOpacity 
      style={[styles.button, loading && styles.buttonDisabled]} 
      onPress={handleAuth}
      disabled={loading}
    >
      <Text style={styles.buttonText}>
        {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {verificationSent && (
        <View style={styles.verificationContainer}>
          <Text style={styles.verificationText}>
            A verification link has been sent to your email.
            Please check your inbox and verify your account before signing in.
          </Text>
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {renderButton()}
      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={styles.switchText}>
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Add new styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#fff',
    marginBottom: 15,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#4caf50',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  switchText: {
    color: '#4caf50',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#2c2c2e',
    opacity: 0.7,
  },
  networkError: {
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  networkErrorText: {
    color: '#fff',
    textAlign: 'center',
  },
  verificationContainer: {
    backgroundColor: '#4CAF5033',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
  },
  verificationText: {
    color: '#4CAF50',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default AuthScreen;
