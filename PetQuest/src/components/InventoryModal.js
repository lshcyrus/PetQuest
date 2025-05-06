import { useEffect, useState } from 'react';

/**
 * InventoryModal component for displaying and selecting items from inventory
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when modal is closed
 * @param {string} props.actionType - Type of action ('feed', 'play', 'train', 'medicine')
 * @param {Function} props.onItemSelect - Function to call when an item is selected
 */
const InventoryModal = ({ isOpen, onClose, actionType, onItemSelect }) => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Map action types to item types
    const actionTypeMap = {
        feed: 'food',
        play: 'toy',
        train: 'equipment',
        medicine: 'medicine'
    };
    
    const requiredItemType = actionTypeMap[actionType];
    
    // Load inventory data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchInventory();
        }
    }, [isOpen]);
    
    // Fetch inventory from the backend
    const fetchInventory = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            const API_URL = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API_URL}/users/me/inventory`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch inventory');
            }
            
            setInventory(data.data || []);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Get color class based on item rarity
    const getRarityColor = (rarity) => {
        switch (rarity) {
            case 'common': return 'text-gray-200';
            case 'uncommon': return 'text-green-400';
            case 'rare': return 'text-blue-400';
            case 'epic': return 'text-purple-400';
            case 'legendary': return 'text-yellow-400';
            default: return 'text-white';
        }
    };
    
    // Filter items by the current action type
    const filteredItems = inventory.filter(
        invItem => invItem.item && invItem.item.type === requiredItemType
    );
    
    // If modal is not open, don't render anything
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4 w-4/5 max-w-md max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-bold">
                        Select {actionType.charAt(0).toUpperCase() + actionType.slice(1)} Item
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
                
                <div className="overflow-y-auto flex-grow">
                    {loading ? (
                        <p className="text-white text-center py-4">Loading inventory...</p>
                    ) : error ? (
                        <p className="text-red-400 text-center py-4">{error}</p>
                    ) : filteredItems.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">
                            No {requiredItemType} items found in your inventory
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {filteredItems.map((invItem) => (
                                <div 
                                    key={invItem.item._id}
                                    className="bg-gray-700 rounded p-3 cursor-pointer hover:bg-gray-600 transition"
                                    onClick={() => onItemSelect(invItem.item._id)}
                                >
                                    <p className={`font-bold ${getRarityColor(invItem.item.rarity)}`}>
                                        {invItem.item.name}
                                    </p>
                                    <p className="text-gray-300 text-sm truncate">
                                        {invItem.item.description}
                                    </p>
                                    <p className="text-gray-400 text-sm mt-2">
                                        Quantity: {invItem.quantity}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InventoryModal; 