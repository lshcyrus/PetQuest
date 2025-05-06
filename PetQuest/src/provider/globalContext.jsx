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
  
  // State for user data - only get username from localStorage initially
  const [userData, setUserData] = useState({
    username: localStorage.getItem('username') || '',
    selectedPet: null, 
    hasSelectedPet: false,
    isFirstLogin: false,
    level: 1,
    experience: 0,
    coins: 0,
    gems: 0,
    items: [],  // Keep for backward compatibility
    inventory: [], // Add inventory field to match backend
    achievements: [], 
    lastLogin: null,
    settings: {
      soundEnabled: true,
      notificationsEnabled: true,
    }
  });

  // Load user data from server when provider mounts
  useEffect(() => {
    console.log('GlobalProvider initialized with username:', userData.username);
    
    const loadUserData = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // If no token exists, skipping user data fetch
        if (!token) {
          console.log('No token found, skipping user data fetch');
          return;
        }
        
        console.log('Fetching user data from API');
        
        // Get data from the server
        const response = await fetch(`${API_URL}/users/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          console.error('API error:', responseData.error || 'Unknown error');
          throw new Error(responseData.error || 'Failed to load user data');
        }
        
        // The API returns { success: true, data: userData }
        if (responseData.success && responseData.data) {
          const serverUserData = responseData.data;
          console.log('User data loaded:', serverUserData);
          
          // Update the user data with server data
          setUserData(prev => ({
            ...prev,
            username: serverUserData.username || prev.username,
            hasSelectedPet: serverUserData.hasSelectedPet || false,
            selectedPet: serverUserData.selectedPet || null,
            inventory: serverUserData.inventory || [],
            items: serverUserData.inventory || [],
            coins: serverUserData.coins || prev.coins,
            gems: serverUserData.gems || prev.gems,
            // Add other fields from serverUserData as needed
          }));
          
          // Set isFirstLogin based on hasSelectedPet
          if (!serverUserData.hasSelectedPet) {
            console.log('First-time user detected - will route to pet selection');
          } else {
            console.log('Returning user - will route to main menu');
          }
        } else {
          console.warn('Unexpected response format:', responseData);
        }
      } catch (error) {
        console.error('Failed to load user data:', error.message);
      }
    };

    // Only attempt to load user data if username exists
    if (userData.username) {
      loadUserData();
    }
  }, [API_URL, userData.username]);

  // Select a pet and update server
  const selectPet = async (petData) => {
    try {
      // Validate pet data
      if (!petData || !petData._id) {
        console.error('Invalid pet data: Missing pet ID');
        return;
      }
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      // If no token exists, don't try to save pet selection
      if (!token) {
        console.log('No token found, skipping server update for pet selection');
        return;
      }
      
      console.log('Updating pet selection on server for pet ID:', petData._id);
      
      // Update server
      const response = await fetch(`${API_URL}/pets/${petData._id}/select`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Failed to update pet selection:', responseData.error || 'Unknown error');
        throw new Error(responseData.error || 'Failed to update pet selection');
      }
      
      // Update local state with data from server
      setUserData(prev => ({ 
        ...prev, 
        selectedPet: responseData.data.pet,
        hasSelectedPet: true,
        isFirstLogin: false 
      }));
      
      console.log('Pet selection updated successfully:', responseData);
    } catch (error) {
      console.error('Error updating pet selection:', error.message);
      // Don't revert local state to maintain good UX even if server update fails
    }
  };

  // Update user data functions
  const updateUsername = (name) => {
    setUserData(prev => ({ ...prev, username: name }));
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
    setUserData(prev => ({ 
      ...prev, 
      items: [...prev.items, item],
      inventory: [...prev.inventory, item] 
    }));
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
    localStorage.removeItem('username');
    
    setUserData({
      username: '',
      selectedPet: null,
      hasSelectedPet: false,
      isFirstLogin: false,
      level: 1,
      experience: 0,
      coins: 0,
      gems: 0,
      items: [],
      inventory: [],
      achievements: [],
      lastLogin: null,
      settings: {
        soundEnabled: true,
        notificationsEnabled: true,
      }
    });
  };

  // Function to fetch and update inventory
  const fetchInventory = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      // If no token exists, don't try to fetch inventory
      if (!token) {
        console.log('No token found, skipping inventory fetch');
        return;
      }
      
      console.log('Fetching user inventory from API');
      
      // Get inventory data from the server
      const response = await fetch(`${API_URL}/users/me/inventory`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Inventory API response status:', response.status);
      const responseData = await response.json();
      console.log('Inventory API raw response:', responseData);
      
      if (!response.ok) {
        console.error('API error fetching inventory:', responseData.error || 'Unknown error');
        throw new Error(responseData.error || 'Failed to load inventory');
      }
      
      if (responseData.success && responseData.data) {
        const inventoryData = responseData.data;
        console.log('Inventory loaded, item count:', inventoryData.length);
        console.log('Inventory data details:', JSON.stringify(inventoryData));
        
        // Update the user data with inventory data
        setUserData(prev => {
          console.log('Updating userData with inventory, previous items/inventory length:', 
            prev.items.length, prev.inventory.length);
          return {
            ...prev,
            inventory: inventoryData,
            items: inventoryData // Also update items for backward compatibility
          };
        });
        
        return inventoryData;
      } else {
        console.warn('Unexpected inventory response format:', responseData);
        return [];
      }
    } catch (error) {
      console.error('Failed to load inventory:', error.message);
      return [];
    }
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
    resetUserData,
    fetchInventory,
    isFirstLogin: !userData.hasSelectedPet,
    setPet: (petData) => {
      setUserData(prev => ({ ...prev, selectedPet: petData }));
    },
    updateUserData: (updatedData) => {
      setUserData(prev => ({ ...prev, ...updatedData }));
    }
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