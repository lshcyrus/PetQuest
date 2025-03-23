import { createContext, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { setGlobalContextRef } from '../utils/contextBridge';

// Create the context but don't export it directly
const GlobalContext = createContext();

// Custom hook to use the context
export const useGlobalContext = () => {
  return useContext(GlobalContext);
}

// Provider component
export const GlobalProvider = ({ children }) => {
  const API_URL = import.meta.env.VITE_API_URL;
  
  // State for user data
  const [userData, setUserData] = useState({
    username: localStorage.getItem('username') || '',
    pet: null, // Will store the chosen pet object
    hasSelectedPet: localStorage.getItem('petquest_has_selected_pet') === 'true' || false,
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

  // Load user data from storage when provider mounts
  useEffect(() => {
    console.log('GlobalProvider initialized with username:', userData.username);
    
    const loadUserData = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // If no token exists, don't try to fetch user data
        if (!token) return;
        
        // Get data from the server
        const response = await fetch(`${API_URL}/users/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load user data');
        }
        
        const serverUserData = await response.json();
        if (serverUserData) {
          console.log('User data loaded:', serverUserData);
        }
      } catch (error) {
        console.error('Failed to load user data', error);
      }
    };

    // Only attempt to load user data if username exists
    if (userData.username) {
      loadUserData();
    }
  }, [API_URL]);

  // Save user data to storage whenever it changes
  useEffect(() => {
    const saveUserData = async () => {
      // by using try-catch, we can prevent the app from crashing if saving fails
      try {
        // Don't save if there's no username (user not logged in)
        if (!userData.username) return;
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // If no token exists, don't try to save user data
        if (!token) return;
        
        // Save data to the server
        // const response = await fetch(`${API_URL}/auth/me`, {
        //   method: 'PUT',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Authorization': `Bearer ${token}`
        //   },
        //   body: JSON.stringify(userData)
        // });

        // if (!response.ok) {
        //   throw new Error('Failed to save user data');
        // }
      } catch (error) {
        console.error('Failed to save user data', error);
      }
    };

    if (userData.username) {
      saveUserData();
    }
  }, [userData, API_URL]);

  // Update user data functions
  const updateUsername = (name) => {
    setUserData(prev => ({ ...prev, username: name }));
  };

  // Select a pet and store it in the user data
  const selectPet = (petData) => {
    setUserData(prev => ({ ...prev, pet: petData }));
  };

  // Update the user's level
  const updateLevel = (newLevel) => {
    setUserData(prev => ({ ...prev, level: newLevel }));
  };

  // Add experience points to the user
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
    // Clear token from localStorage
    localStorage.removeItem('token');
    
    // setUserData({
    //   username: '',
    //   pet: null,
    //   level: 1,
    //   experience: 0,
    //   coins: 0,
    //   items: [],
    //   achievements: [],
    //   lastLogin: null,
    //   settings: {
    //     soundEnabled: true,
    //     notificationsEnabled: true,
    //   }
    // });
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

GlobalProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Export the provider instead of the context directly
export default GlobalProvider;