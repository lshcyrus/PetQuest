import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { setGlobalContextRef } from '../utils/contextBridge';

// Create the context but don't export it directly
const GlobalContext = createContext();

// Custom hook to use the context
export const useGlobalContext = () => {
  return useContext(GlobalContext);
}

// Provider component
export const GlobalProvider = ({ children }) => {
  // State for user data
  const [userData, setUserData] = useState({
    username: '',
    pet: null, // Will store the chosen pet object
    level: 1,
    experience: 0,
    coins: 0,
    items: [], // Inventory items
    achievements: [], // Completed achievements
    lastLogin: null,
    settings: {
      soundEnabled: true,
      notificationsEnabled: true,
    }
  });

  // Load user data from storage when app starts
  useEffect(() => {
    const loadUserData = () => {
      try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          setUserData(JSON.parse(storedUserData));
        }
      } catch (error) {
        console.error('Failed to load user data', error);
      }
    };

    loadUserData();
  }, []);

  // Save user data to storage whenever it changes
  useEffect(() => {
    const saveUserData = () => {
      try {
        localStorage.setItem('userData', JSON.stringify(userData));
      } catch (error) {
        console.error('Failed to save user data', error);
      }
    };

    if (userData.username) {
      saveUserData();
    }
  }, [userData]);

  // Update user data functions
  const updateUsername = (name) => {
    setUserData(prev => ({ ...prev, username: name }));
  };

  const selectPet = (petData) => {
    setUserData(prev => ({ ...prev, pet: petData }));
  };

  const updateLevel = (newLevel) => {
    setUserData(prev => ({ ...prev, level: newLevel }));
  };

  const addExperience = (amount) => {
    setUserData(prev => ({ ...prev, experience: prev.experience + amount }));
  };

  const addCoins = (amount) => {
    setUserData(prev => ({ ...prev, coins: prev.coins + amount }));
  };

  const addItem = (item) => {
    setUserData(prev => ({ ...prev, items: [...prev.items, item] }));
  };

  const updateSettings = (newSettings) => {
    setUserData(prev => ({ 
      ...prev, 
      settings: { ...prev.settings, ...newSettings } 
    }));
  };

  const resetUserData = () => {
    setUserData({
      username: '',
      pet: null,
      level: 1,
      experience: 0,
      coins: 0,
      items: [],
      achievements: [],
      lastLogin: null,
      settings: {
        soundEnabled: true,
        notificationsEnabled: true,
      }
    });
  };

  // Values to be provided by the context
  const value = {
    userData,
    updateUsername,
    selectPet,
    updateLevel,
    addExperience,
    addCoins,
    addItem,
    updateSettings,
    resetUserData
  };

  // Make context accessible outside React
  useEffect(() => {
    setGlobalContextRef(value);
  }, [value]);

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

// Export the provider instead of the context directly
export default GlobalProvider;