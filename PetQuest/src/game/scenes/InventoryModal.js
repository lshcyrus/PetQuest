/**
InventoryModal - A Phaser modal to display and select items from inventory
*/
import { getGlobalContext } from '../../utils/contextBridge';

export class InventoryModal {
    /**
      Create an inventory modal
      @param {Phaser.Scene} scene - The scene this modal belongs to
      @param {Object} options - Modal options
      @param {string} options.actionType - Type of action ('feed', 'play', 'train', 'medicine')
      @param {Function} options.onItemSelect - Callback when item is selected
      @param {Function} options.onClose - Callback when modal is closed
     */
    constructor(scene, options) {
        this.scene = scene;
        this.actionType = options.actionType || 'feed';
        this.onItemSelect = options.onItemSelect || (() => {});
        this.onClose = options.onClose || (() => {});
        
        // Map action types to item types
        this.actionTypeMap = {
            feed: 'food',
            play: 'toy',
            train: 'equipment',
            medicine: 'medicine',
            view: undefined // show all items
        };
        
        this.requiredItemType = this.actionTypeMap[this.actionType];
        this.inventory = [];
        this.filteredItems = [];
        this.selectedIndex = -1;
        
        // UI containers
        this.container = null;
        this.itemsContainer = null;
        this.itemCards = [];
        this.loadingText = null;
        this.errorText = null;
        this.emptyText = null;
        
        // Appearance settings
        this.width = Math.min(this.scene.scale.width * 0.8, 700);
        this.height = Math.min(this.scene.scale.height * 0.7, 600);
        this.padding = 20;
        this.itemHeight = 80;
        this.itemPadding = 10;
        this.backgroundColor = 0x222222;
        this.itemBackgroundColor = 0x333333;
        this.itemHoverColor = 0x444444;
        this.itemSelectedColor = 0x555555;
        
        // Item rarity colors
        this.rarityColors = {
            common: 0xffffff,
            uncommon: 0x00ff00,
            rare: 0x0088ff,
            epic: 0xaa00ff,
            legendary: 0xffaa00
        };
    }
    
    /**
     Show the modal and fetch inventory data
     */
    show() {
        this.createModal();
        this.fetchInventory();
    }
    
    /**
     Create the modal UI elements
     */
    createModal() {
        // Create the container for all elements
        this.container = this.scene.add.container(0, 0);
        
        // Add background overlay
        const overlay = this.scene.add.rectangle(
            0, 0, 
            this.scene.scale.width * 2, 
            this.scene.scale.height * 2,
            0x000000, 0.7
        );
        overlay.setOrigin(0, 0);
        overlay.setInteractive();
        this.container.add(overlay);
        
        // Add modal background
        const modalX = this.scene.scale.width / 2 - this.width / 2;
        const modalY = this.scene.scale.height / 2 - this.height / 2;
        const modalBg = this.scene.add.rectangle(
            modalX, modalY,
            this.width, this.height,
            this.backgroundColor, 1
        );
        modalBg.setOrigin(0, 0);
        modalBg.setStrokeStyle(2, 0xffffff);
        this.container.add(modalBg);
        
        // Add title
        const actionName = this.actionType.charAt(0).toUpperCase() + this.actionType.slice(1);
        const title = this.scene.add.text(
            modalX + this.width / 2,
            modalY + 20,
            `Select ${actionName} Item`,
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '24px',
                color: '#ffffff'
            }
        );
        title.setOrigin(0.5, 0);
        this.container.add(title);
        
        // Create container for item display
        const itemsY = modalY + 60;
        const itemsHeight = this.height - 80;
        
        // Mask for scrolling
        const itemsMask = this.scene.add.graphics();
        itemsMask.fillRect(modalX + this.padding, itemsY, this.width - this.padding * 2, itemsHeight);
        
        // Container for items
        this.itemsContainer = this.scene.add.container(modalX + this.padding, itemsY);
        this.itemsContainer.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, itemsMask));
        this.container.add(this.itemsContainer);
        
        // Add close button on top of everything else as a separate top-level element
        const closeButtonContainer = this.scene.add.container(0, 0);
        closeButtonContainer.setDepth(2000); // Higher depth than anything else
        
        const closeBtn = this.scene.add.rectangle(
            modalX + this.width - this.padding - 10,
            modalY + this.padding + 10,
            30, 30, 0x880000
        );
        closeBtn.setOrigin(0.5, 0.5);
        closeBtn.setInteractive({ 
            useHandCursor: true,
            hitArea: new Phaser.Geom.Rectangle(-20, -20, 70, 70),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains
        });
        
        // Add hover effects
        closeBtn.on('pointerover', () => {
            closeBtn.setFillStyle(0xaa0000); // Brighter red on hover
            closeBtn.setScale(1.1); // Slightly larger on hover
        });
        
        closeBtn.on('pointerout', () => {
            closeBtn.setFillStyle(0x880000); // Back to original color
            closeBtn.setScale(1.0); // Back to original size
        });
        
        // Make the button respond to clicks with priority
        closeBtn.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.close();
        });
        closeButtonContainer.add(closeBtn);
        
        const closeBtnText = this.scene.add.text(
            closeBtn.x,
            closeBtn.y,
            'X',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff'
            }
        );
        closeBtnText.setOrigin(0.5, 0.5);
        closeButtonContainer.add(closeBtnText);
        
        // Add the close button container to the main container
        this.container.add(closeButtonContainer);
        
        // Loading text
        this.loadingText = this.scene.add.text(
            modalX + this.width / 2,
            modalY + this.height / 2,
            'Loading inventory...',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff'
            }
        );
        this.loadingText.setOrigin(0.5);
        this.container.add(this.loadingText);
        
        // Error text (hidden)
        this.errorText = this.scene.add.text(
            modalX + this.width / 2,
            modalY + this.height / 2,
            '',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ff4444'
            }
        );
        this.errorText.setOrigin(0.5);
        this.errorText.setVisible(false);
        this.container.add(this.errorText);
        
        // Empty text (hidden)
        this.emptyText = this.scene.add.text(
            modalX + this.width / 2,
            modalY + this.height / 2,
            `No ${this.requiredItemType} items found in your inventory`,
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#aaaaaa',
                wordWrap: { width: this.width - this.padding * 4 }
            }
        );
        this.emptyText.setOrigin(0.5);
        this.emptyText.setVisible(false);
        this.container.add(this.emptyText);
        
        // Set up scrolling for items list
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Skip scrolling if the pointer is over the close button
            if (closeBtn.getBounds().contains(pointer.x, pointer.y)) {
                return;
            }
            
            if (this.filteredItems.length > 0 && pointer.y > itemsY && pointer.y < itemsY + itemsHeight) {
                this.itemsContainer.y -= deltaY;
                
                // Constrain scrolling
                const minY = itemsY;
                const maxItems = Math.floor(itemsHeight / (this.itemHeight + this.itemPadding));
                const maxY = itemsY - (Math.max(0, this.filteredItems.length - maxItems) * (this.itemHeight + this.itemPadding));
                
                if (this.itemsContainer.y > minY) {
                    this.itemsContainer.y = minY;
                } else if (this.itemsContainer.y < maxY) {
                    this.itemsContainer.y = maxY;
                }
            }
        });
        
        // Depth and input settings for the whole container
        this.container.setDepth(1000);
    }
    
    /**
    Fetch inventory data from backend
    */
    async fetchInventory() {
        try {
            // Try to get the inventory from global context first
            const globalContext = getGlobalContext();
            
            if (globalContext) {
                try {
                    // Fetch the latest inventory data using the global context method
                    const inventoryData = await globalContext.fetchInventory();
                    
                    if (inventoryData && Array.isArray(inventoryData) && inventoryData.length > 0) {
                        console.log('Got inventory from global context fetchInventory:', inventoryData.length, 'items');
                        
                        // Verify each item has a proper structure
                        this.inventory = inventoryData.filter(invItem => {
                            const isValid = invItem && invItem.item;
                            if (!isValid) console.warn('Invalid inventory item structure:', invItem);
                            return isValid;
                        });
                        
                        this.filterItems();
                        this.displayItems();
                        return;
                    }
                } catch (err) {
                    console.warn('Error using globalContext.fetchInventory():', err.message);
                }
                
                // Try using existing inventory in userData
                if (globalContext.userData && 
                    globalContext.userData.inventory && 
                    Array.isArray(globalContext.userData.inventory) && 
                    globalContext.userData.inventory.length > 0) {
                    
                    console.log('Using existing inventory from global context:', globalContext.userData.inventory.length, 'items');
                    
                    // Verify each item has a proper structure
                    this.inventory = globalContext.userData.inventory.filter(invItem => {
                        const isValid = invItem && invItem.item;
                        if (!isValid) console.warn('Invalid inventory item in userData:', invItem);
                        return isValid;
                    });
                    
                    this.filterItems();
                    this.displayItems();
                    return;
                }
                
                // Fall back to direct API call, if the global context didn't have inventory data
                console.log('No valid inventory in global context, falling back to direct API call');
            }

            // Direct API call as fallback
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
            
            console.log('Got inventory from direct API call:', data);
            
            // Ensure there is a proper data structure
            if (!data.data || !Array.isArray(data.data)) {
                console.error('Invalid response structure from API:', data);
                throw new Error('Invalid response from server');
            }
            
            this.inventory = data.data.filter(invItem => {
                const isValid = invItem && invItem.item;
                if (!isValid) console.warn('Invalid inventory item from API:', invItem);
                return isValid;
            });
            
            // Update the global context if it exists
            if (globalContext) {
                globalContext.updateUserData({
                    inventory: this.inventory,
                    items: this.inventory
                });
            }
            
            this.filterItems();
            this.displayItems();
        } catch (err) {
            console.error('Error fetching inventory:', err);
            this.showError(err.message);
        }
    }
    
    /**
     Filter inventory by the required item type
     */
    filterItems() {
        if (this.requiredItemType) {
            this.filteredItems = this.inventory.filter(
                invItem => invItem.item && invItem.item.type === this.requiredItemType
            );
        } else {
            // Show all items when requiredItemType is undefined (view mode)
            this.filteredItems = [...this.inventory].filter(invItem => invItem && invItem.item);
        }
        
        // Log filtered items for debugging
        console.log(`Filtered ${this.filteredItems.length} items from ${this.inventory.length} total items`);
        if (this.filteredItems.length === 0 && this.inventory.length > 0) {
            console.log('Inventory structure:', JSON.stringify(this.inventory.slice(0, 2)));
        }
    }
    
    /**
     Display filtered items in the modal
     */
    displayItems() {
        // Hide loading text
        this.loadingText.setVisible(false);
        
        // Clear any existing items
        this.itemCards.forEach(card => card.destroy());
        this.itemCards = [];
        
        // Show empty message if no items found
        if (!this.filteredItems || this.filteredItems.length === 0) {
            this.emptyText.setVisible(true);
            return;
        }
        
        // Create item cards
        this.filteredItems.forEach((invItem, index) => {
            // Skip items with null item reference
            if (!invItem || !invItem.item) {
                console.warn('Skipping invalid inventory item:', invItem);
                return;
            }
            
            const item = invItem.item;
            const y = index * (this.itemHeight + this.itemPadding);
            
            // Item card background
            const card = this.scene.add.rectangle(
                0, y,
                this.width - this.padding * 2,
                this.itemHeight,
                this.itemBackgroundColor
            );
            card.setOrigin(0, 0);
            card.setInteractive({ useHandCursor: true });
            
            // Hover effects
            card.on('pointerover', () => {
                if (this.selectedIndex !== index) {
                    card.setFillStyle(this.itemHoverColor);
                }
            });
            card.on('pointerout', () => {
                if (this.selectedIndex !== index) {
                    card.setFillStyle(this.itemBackgroundColor);
                }
            });
            
            // Selection
            card.on('pointerdown', () => {
                this.selectItem(index);
            });
            
            // Item image
            let itemImage;
            const imageSize = this.itemHeight - 10;
            const imageX = 10;
            const imageY = y + this.itemHeight / 2;
            
            // Get image key from item data - could be name, image field, or a default
            const imageKey = (item && item.name) ? item.name : 'hp-potion'; // Default fallback
            
            try {
                itemImage = this.scene.add.image(imageX + imageSize/2, imageY, imageKey);
                
                // Scale image to fit
                const scale = Math.min(
                    imageSize / itemImage.width,
                    imageSize / itemImage.height
                );
                itemImage.setScale(scale);
                
                // Create shadow as a darker version of the image below the actual image
                const shadow = this.scene.add.image(imageX + imageSize/2 + 2, imageY + 2, imageKey);
                shadow.setScale(scale);
                shadow.setTint(0x000000);
                shadow.setAlpha(0.5);
                
                // Add shadow to container first so it appears behind the main image
                this.itemsContainer.add(shadow);
                // Remove the image temporarily and add it again to make it above the shadow
                this.itemsContainer.remove(itemImage);
            } catch (err) {
                console.warn(`Failed to load image for ${imageKey}:`, err);
                // Create a fallback colored square if image fails to load
                itemImage = this.scene.add.rectangle(
                    imageX + imageSize/2, 
                    imageY, 
                    imageSize, 
                    imageSize, 
                    this.rarityColors[item?.rarity] || 0x666666
                );
                // Add item type text to the fallback rectangle
                const typeText = this.scene.add.text(
                    imageX + imageSize/2,
                    imageY,
                    (item && item.type) ? item.type.substring(0, 3).toUpperCase() : '???',
                    {
                        fontFamily: '"Silkscreen", cursive',
                        fontSize: '14px',
                        color: '#ffffff'
                    }
                ).setOrigin(0.5);
                this.itemsContainer.add(typeText);
            }
            
            // Adjust name and description position to account for image
            const textX = imageX + imageSize + 10;
            
            // Item name with rarity color
            const rarityColor = this.rarityColors[item?.rarity] || 0xffffff;
            const nameText = this.scene.add.text(
                textX, y + 10,
                item?.name || 'Unknown Item',
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '18px',
                    color: Phaser.Display.Color.ValueToColor(rarityColor).rgba
                }
            );
            
            // Item description
            const descText = this.scene.add.text(
                textX, y + 40,
                item?.description || 'No description available',
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '14px',
                    color: '#cccccc',
                    wordWrap: { width: this.width - textX - this.padding * 2 - 70 }
                }
            );
            
            // Quantity
            const qtyText = this.scene.add.text(
                this.width - this.padding * 3 - 10, y + 10,
                `Qty: ${invItem.quantity}`,
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '16px',
                    color: '#aaaaaa'
                }
            );
            qtyText.setOrigin(1, 0);
            
            // Add to container
            this.itemsContainer.add([card, itemImage, nameText, descText, qtyText]);
            this.itemCards.push({ 
                card, 
                image: itemImage, 
                nameText, 
                descText, 
                qtyText, 
                itemId: item._id 
            });
        });
    }
    
    /**
     Show an error message
     @param {string} message - Error message to display
     */
    showError(message) {
        this.loadingText.setVisible(false);
        this.errorText.setText(message);
        this.errorText.setVisible(true);
    }
    
    /**
     Select an item by index
     @param {number} index - Index of item to select
     */
    selectItem(index) {
        // Check if the index is valid
        if (index < 0 || index >= this.itemCards.length) {
            console.warn(`Invalid item index: ${index}, max: ${this.itemCards.length - 1}`);
            return;
        }

        // Deselect previous item
        if (this.selectedIndex !== -1 && 
            this.selectedIndex < this.itemCards.length && 
            this.itemCards[this.selectedIndex] && 
            this.itemCards[this.selectedIndex].card) {
            this.itemCards[this.selectedIndex].card.setFillStyle(this.itemBackgroundColor);
        }
        
        // Select new item
        this.selectedIndex = index;
        
        if (!this.itemCards[index] || !this.itemCards[index].card) {
            console.warn(`Item card at index ${index} is not valid`);
            return;
        }
        
        this.itemCards[index].card.setFillStyle(this.itemSelectedColor);
        
        // Call onItemSelect with the item ID
        const itemId = this.itemCards[index].itemId;
        if (!itemId) {
            console.warn(`No itemId found for index ${index}`);
            return;
        }
        
        this.onItemSelect(itemId);
        
        // Close the modal
        this.close();
    }
    
    /**
     Close the modal
     */
    close() {
        this.container.destroy();
        this.onClose();
    }
} 