import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FontSizeContext = createContext();

export const FontSizeProvider = ({ children }) => {
    const [fontSize, setFontSize] = useState('normal');
  
    useEffect(() => {
      loadFontSize();
    }, []);
  
    const loadFontSize = async () => {
      try {
        const savedFontSize = await AsyncStorage.getItem('fontSize');
        if (savedFontSize) {
          setFontSize(savedFontSize);
        }
      } catch (error) {
        console.error('Error loading font size:', error);
      }
    };
  
    return (
      <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
        {children}
      </FontSizeContext.Provider>
    );
  };

export const useFontSize = () => {
    const context = useContext(FontSizeContext);
    if (!context) {
      throw new Error('useFontSize must be used within a FontSizeProvider');
    }
    return context;
  };