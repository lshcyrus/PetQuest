/**
 * InventoryModal - A Phaser modal to display and select items from inventory
 */
export class InventoryModal {
    /**
     * Create an inventory modal
     * @param {Phaser.Scene} scene - The scene this modal belongs to
     * @param {Object} options - Modal options
     * @param {string} options.actionType - Type of action ('feed', 'play', 'train', 'medicine')
     * @param {Function} options.onItemSelect - Callback when item is selected
     * @param {Function} options.onClose - Callback when modal is closed
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
            medicine: 'medicine'
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
        this.width = Math.min(this.scene.scale.width * 0.8, 500);
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
     * Show the modal and fetch inventory data
     */
    show() {
        this.createModal();
        this.fetchInventory();
    }
    
    /**
     * Create the modal UI elements
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
        
        // Add close button
        const closeBtn = this.scene.add.text(
            modalX + this.width - this.padding,
            modalY + this.padding,
            'X',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#aaaaaa'
            }
        );
        closeBtn.setOrigin(1, 0);
        closeBtn.setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#aaaaaa'));
        closeBtn.on('pointerdown', () => this.close());
        this.container.add(closeBtn);
        
        // Create container for item display
        const itemsY = modalY + 60;
        const itemsHeight = this.height - 120;
        
        // Mask for scrolling
        const itemsMask = this.scene.add.graphics();
        itemsMask.fillRect(modalX + this.padding, itemsY, this.width - this.padding * 2, itemsHeight);
        
        // Container for items
        this.itemsContainer = this.scene.add.container(modalX + this.padding, itemsY);
        this.itemsContainer.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, itemsMask));
        this.container.add(this.itemsContainer);
        
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
        
        // Error text (hidden initially)
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
        
        // Empty text (hidden initially)
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
        
        // Add cancel button at bottom
        const cancelBtn = this.scene.add.rectangle(
            modalX + this.width/2,
            modalY + this.height - this.padding - 20,
            120, 40, 0xaa0000
        );
        cancelBtn.setOrigin(0.5, 0.5);
        cancelBtn.setInteractive({ useHandCursor: true });
        cancelBtn.on('pointerdown', () => this.close());
        this.container.add(cancelBtn);
        
        const cancelText = this.scene.add.text(
            cancelBtn.x,
            cancelBtn.y,
            'Cancel',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '16px',
                color: '#ffffff'
            }
        );
        cancelText.setOrigin(0.5, 0.5);
        this.container.add(cancelText);
        
        // Set up scrolling for items list
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
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
     * Fetch inventory data from backend
     */
    async fetchInventory() {
        try {
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
            
            this.inventory = data.data || [];
            this.filterItems();
            this.displayItems();
        } catch (err) {
            console.error('Error fetching inventory:', err);
            this.showError(err.message);
        }
    }
    
    /**
     * Filter inventory by the required item type
     */
    filterItems() {
        this.filteredItems = this.inventory.filter(
            invItem => invItem.item && invItem.item.type === this.requiredItemType
        );
    }
    
    /**
     * Display filtered items in the modal
     */
    displayItems() {
        // Hide loading text
        this.loadingText.setVisible(false);
        
        // Clear any existing items
        this.itemCards.forEach(card => card.destroy());
        this.itemCards = [];
        
        // Show empty message if no items found
        if (this.filteredItems.length === 0) {
            this.emptyText.setVisible(true);
            return;
        }
        
        // Create item cards
        this.filteredItems.forEach((invItem, index) => {
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
            
            // Item name with rarity color
            const rarityColor = this.rarityColors[item.rarity] || 0xffffff;
            const nameText = this.scene.add.text(
                10, y + 10,
                item.name,
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '18px',
                    color: Phaser.Display.Color.ValueToColor(rarityColor).rgba
                }
            );
            
            // Item description
            const descText = this.scene.add.text(
                10, y + 40,
                item.description,
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '14px',
                    color: '#cccccc',
                    wordWrap: { width: this.width - this.padding * 4 - 70 }
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
            this.itemsContainer.add([card, nameText, descText, qtyText]);
            this.itemCards.push({ card, nameText, descText, qtyText, itemId: item._id });
        });
    }
    
    /**
     * Show an error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.loadingText.setVisible(false);
        this.errorText.setText(message);
        this.errorText.setVisible(true);
    }
    
    /**
     * Select an item by index
     * @param {number} index - Index of item to select
     */
    selectItem(index) {
        // Deselect previous item
        if (this.selectedIndex !== -1 && this.itemCards[this.selectedIndex]) {
            this.itemCards[this.selectedIndex].card.setFillStyle(this.itemBackgroundColor);
        }
        
        // Select new item
        this.selectedIndex = index;
        this.itemCards[index].card.setFillStyle(this.itemSelectedColor);
        
        // Call onItemSelect with the item ID
        const itemId = this.itemCards[index].itemId;
        this.onItemSelect(itemId);
        
        // Close the modal
        this.close();
    }
    
    /**
     * Close the modal
     */
    close() {
        this.container.destroy();
        this.onClose();
    }
} 