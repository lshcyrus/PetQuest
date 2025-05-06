import { getGlobalContext } from '../../utils/contextBridge';

export class ShopModal {
    constructor(scene, options) {
        this.scene = scene;
        this.itemType = options.itemType;
        this.onClose = options.onClose || (() => {});
        
        // UI containers
        this.container = null;
        this.itemsContainer = null;
        this.itemCards = [];
        this.loadingText = null;
        this.errorText = null;
        this.emptyText = null;
        
        // Appearance
        this.width = Math.min(this.scene.scale.width * 0.8, 700);
        this.height = Math.min(this.scene.scale.height * 0.7, 600);
        this.padding = 20;
        this.itemHeight = 100; 
        this.itemPadding = 10;
        this.backgroundColor = 0x222222;
        this.itemBackgroundColor = 0x333333;
        this.itemHoverColor = 0x444444;
        
        // Different colours for different rarity
        this.rarityColors = {
            common: 0xffffff,
            uncommon: 0x00ff00,
            rare: 0x0088ff,
            epic: 0xaa00ff,
            legendary: 0xffaa00
        };

        // Data to be stored
        this.shopItems = [];
        this.filteredItems = [];
        this.userCoins = 0;
    }
    
    // Showing the modal
    show() {
        this.createModal();
        this.fetchShopItems();
        this.fetchUserCoins();
    }
    
    // Creating the modal
    createModal() {
        // Container for all elements
        this.container = this.scene.add.container(0, 0);
        
        // Background overlay
        const overlay = this.scene.add.rectangle(
            0, 0, 
            this.scene.scale.width * 2, 
            this.scene.scale.height * 2,
            0x000000, 0.7
        );
        overlay.setOrigin(0, 0);
        overlay.setInteractive();
        this.container.add(overlay);
        
        // Modal background
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
        
        // Title
        const title = this.scene.add.text(
            modalX + this.width / 2,
            modalY + 20,
            this.itemType ? `${this.itemType.charAt(0).toUpperCase() + this.itemType.slice(1)} Shop` : 'Item Shop',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '24px',
                color: '#ffffff'
            }
        );
        title.setOrigin(0.5, 0);
        this.container.add(title);
        
        // Add user coins display
        this.coinsText = this.scene.add.text(
            modalX + this.width / 2,
            modalY + 50,
            'Coins: 0',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '20px',
                color: '#ffdd00',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        );
        this.coinsText.setOrigin(0.5, 0);
        this.container.add(this.coinsText);
        
        // Category tabs
        this.createCategoryTabs(modalX, modalY + 80);
        
        // Container for item display
        const itemsY = modalY + 135; 
        const itemsHeight = this.height - 135; 
        
        // Mask for scrolling
        const itemsMask = this.scene.add.graphics();
        itemsMask.fillRect(modalX + this.padding, itemsY, this.width - this.padding * 2, itemsHeight);
        
        // Container for items
        this.itemsContainer = this.scene.add.container(modalX + this.padding, itemsY);
        this.itemsContainer.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, itemsMask));
        this.container.add(this.itemsContainer);
        
        // Close button on top of everything
        const closeButtonContainer = this.scene.add.container(0, 0);
        closeButtonContainer.setDepth(2000); // Highest depth
        
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
        
        // Hover effects
        closeBtn.on('pointerover', () => {
            closeBtn.setFillStyle(0xaa0000); 
            closeBtn.setScale(1.1); 
        });
        
        closeBtn.on('pointerout', () => {
            closeBtn.setFillStyle(0x880000);
            closeBtn.setScale(1.0); 
        });
        
        // Button respond
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
        
        // Close button container added to the main container
        this.container.add(closeButtonContainer);
        
        this.loadingText = this.scene.add.text(
            modalX + this.width / 2,
            modalY + this.height / 2,
            'Loading shop items...',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff'
            }
        );
        this.loadingText.setOrigin(0.5);
        this.container.add(this.loadingText);
        
        // Error text
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
        
        // Empty text 
        this.emptyText = this.scene.add.text(
            modalX + this.width / 2,
            modalY + this.height / 2,
            `No items available in the shop`,
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
        
        // Scrolling for items 
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Stop scrolling if the pointer is out of bounds
            if (closeBtn.getBounds().contains(pointer.x, pointer.y)) {
                return;
            }
            
            if (this.filteredItems.length > 0 && pointer.y > itemsY && pointer.y < itemsY + itemsHeight) {
                this.itemsContainer.y -= deltaY;
                
                // Keep scrolling
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
        
        this.container.setDepth(1000);
    }
    
    // Getting shop items from backend
    async fetchShopItems() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            const API_URL = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API_URL}/items?type=${this.itemType || ''}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch shop items');
            }
            
            this.shopItems = data.data || [];
            this.filterItems();
            this.displayItems();
        } catch (err) {
            console.error('Error fetching shop items:', err);
            this.showError(err.message);
        }
    }
    
    // Getting user's coin balance
    async fetchUserCoins() {
        const globalContext = getGlobalContext();
        if (globalContext) {
            console.log('ShopModal - Getting coins from globalContext:', globalContext.userData);
            this.userCoins = globalContext.userData.coins || 0;
            console.log('ShopModal - User coins loaded:', this.userCoins);
            this.updateCoinsDisplay();
        } else {
            console.warn('ShopModal - No global context available for getting coins');
        }
    }
    
    updateCoinsDisplay() {
        if (this.coinsText) {
            this.coinsText.setText(`Coins: ${this.userCoins}`);
        }
    }
    
    filterItems() {
        if (this.itemType) {
            this.filteredItems = this.shopItems.filter(
                item => item.type === this.itemType
            );
        } else {
            // Show all items when itemType is undefined (view all)
            this.filteredItems = [...this.shopItems];
        }
    }

    createCategoryTabs(modalX, tabY) {
        const categories = [
            { id: null, label: 'All' },
            { id: 'toy', label: 'Toys' },
            { id: 'medicine', label: 'Potions' },
            { id: 'food', label: 'Food' },
            { id: 'equipment', label: 'Equipment' }
        ];
        
        const tabWidth = this.width / categories.length;
        const tabHeight = 40;
        this.tabs = [];
        
        // Creating tabs
        categories.forEach((category, index) => {
            const isSelected = this.itemType === category.id;
            const tabX = modalX + (tabWidth * index);
            
            const tab = this.scene.add.rectangle(
                tabX, tabY,
                tabWidth, tabHeight,
                isSelected ? 0x4477aa : 0x333333
            );
            tab.setOrigin(0, 0);
            tab.setStrokeStyle(1, 0xffffff, isSelected ? 1 : 0.3);
            tab.setInteractive({ useHandCursor: true });
            
            const label = this.scene.add.text(
                tabX + tabWidth / 2,
                tabY + tabHeight / 2,
                category.label,
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '16px',
                    color: isSelected ? '#ffffff' : '#aaaaaa'
                }
            );
            label.setOrigin(0.5);
            
            tab.on('pointerover', () => {
                if (this.itemType !== category.id) {
                    tab.setFillStyle(0x3a5c80);
                    label.setColor('#dddddd');
                }
            });
            
            tab.on('pointerout', () => {
                if (this.itemType !== category.id) {
                    tab.setFillStyle(0x333333);
                    label.setColor('#aaaaaa');
                }
            });
            
            tab.on('pointerdown', () => {
                this.switchCategory(category.id);
            });
            
            // Tab references
            this.container.add([tab, label]);
            this.tabs.push({ tab, label, category });
        });
    }
    
    switchCategory(categoryId) {
        this.itemType = categoryId;
        
        this.tabs.forEach(({ tab, label, category }) => {
            const isSelected = this.itemType === category.id;
            tab.setFillStyle(isSelected ? 0x4477aa : 0x333333);
            tab.setStrokeStyle(1, 0xffffff, isSelected ? 1 : 0.3);
            label.setColor(isSelected ? '#ffffff' : '#aaaaaa');
        });
        
        this.filterItems();
        this.displayItems();
    }
    
    displayItems() {
        // Hide loading text
        this.loadingText.setVisible(false);
        
        // Clear any existing items
        this.itemCards.forEach(card => {
            if (card.destroy && typeof card.destroy === 'function') {
                card.destroy();
            } else {
                // Clearing all children
                for (const key in card) {
                    if (card[key] && card[key].destroy && typeof card[key].destroy === 'function') {
                        card[key].destroy();
                    }
                }
            }
        });
        this.itemCards = [];
        
        this.itemsContainer.removeAll(true);
        
        // Empty message
        if (this.filteredItems.length === 0) {
            this.emptyText.setVisible(true);
            return;
        } else {
            this.emptyText.setVisible(false);
        }
        
        // Item cards
        this.filteredItems.forEach((item, index) => {
            const y = index * (this.itemHeight + this.itemPadding);
            
            const card = this.scene.add.rectangle(
                0, y,
                this.width - this.padding * 2,
                this.itemHeight,
                this.itemBackgroundColor
            );
            card.setOrigin(0, 0);
            card.setInteractive({ useHandCursor: true });
            
            card.on('pointerover', () => {
                card.setFillStyle(this.itemHoverColor);
            });
            card.on('pointerout', () => {
                card.setFillStyle(this.itemBackgroundColor);
            });
            
            this.itemsContainer.add(card);
            
            const imageContainer = this.scene.add.container(0, 0);
            this.itemsContainer.add(imageContainer);
            
            const imageSize = this.itemHeight - 20;
            const imageX = 10;
            const imageY = y + this.itemHeight / 2;
            
            const imageKey = item.name || 'hp-potion'; // Default fallback
            
            let itemImage;
            try {
                // Shadow
                const shadow = this.scene.add.image(imageX + imageSize/2 + 2, imageY + 2, imageKey);
                const scale = Math.min(imageSize / shadow.width, imageSize / shadow.height);
                shadow.setScale(scale);
                shadow.setTint(0x000000);
                shadow.setAlpha(0.5);
                imageContainer.add(shadow);
                
                // Main image
                itemImage = this.scene.add.image(imageX + imageSize/2, imageY, imageKey);
                itemImage.setScale(scale);
                imageContainer.add(itemImage);
            } catch (err) {
                console.warn(`Failed to load image for ${imageKey}:`, err);
                // Fallback colored square
                itemImage = this.scene.add.rectangle(
                    imageX + imageSize/2, 
                    imageY, 
                    imageSize, 
                    imageSize, 
                    this.rarityColors[item.rarity] || 0x666666
                );
                imageContainer.add(itemImage);
                
                const typeText = this.scene.add.text(
                    imageX + imageSize/2,
                    imageY,
                    item.type?.substring(0, 3).toUpperCase() || '???',
                    {
                        fontFamily: '"Silkscreen", cursive',
                        fontSize: '14px',
                        color: '#ffffff'
                    }
                ).setOrigin(0.5);
                imageContainer.add(typeText);
            }
            
            const textX = imageX + imageSize + 10;
            
            const rarityColor = this.rarityColors[item.rarity] || 0xffffff;
            const nameText = this.scene.add.text(
                textX, y + 10,
                item.displayName || item.name,
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '18px',
                    color: Phaser.Display.Color.ValueToColor(rarityColor).rgba
                }
            );
            this.itemsContainer.add(nameText);
            
            // Item description
            const descText = this.scene.add.text(
                textX, y + 40,
                item.description,
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '14px',
                    color: '#cccccc',
                    wordWrap: { width: this.width - textX - this.padding * 2 - 70 }
                }
            );
            this.itemsContainer.add(descText);
            
            // Extract price
            let priceAmount = 0;
            if (typeof item.price === 'number') {
                priceAmount = item.price;
            } else if (item.price && typeof item.price === 'object') {
                priceAmount = item.price.coins || 0;
            }
            
            const priceText = this.scene.add.text(
                this.width - this.padding * 3 - 80, y + 10,
                `Price: ${priceAmount}`,
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '16px',
                    color: '#ffdd00',
                    stroke: '#000000',
                    strokeThickness: 3
                }
            );
            priceText.setOrigin(1, 0);
            this.itemsContainer.add(priceText);
            
            // Buy button
            const buttonX = this.width - this.padding * 2 - 40;
            const buttonY = y + this.itemHeight / 2;
            const buyButton = this.scene.add.rectangle(
                buttonX, buttonY,
                80, 40,
                0x44aa44
            ).setOrigin(0.5);
            
            // Check if user can afford
            const canAfford = this.userCoins >= priceAmount;
            
            if (!canAfford) {
                buyButton.setFillStyle(0x666666);
            }
            
            buyButton.setInteractive({ useHandCursor: canAfford });
            this.itemsContainer.add(buyButton);
            
            const buyText = this.scene.add.text(
                buttonX, buttonY,
                'BUY',
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '16px',
                    color: canAfford ? '#ffffff' : '#aaaaaa'
                }
            ).setOrigin(0.5);
            this.itemsContainer.add(buyText);
            
            if (canAfford) {
                buyButton.on('pointerdown', () => this.purchaseItem(item));
            }
            
            // Data to be stored
            this.itemCards.push({
                card,
                nameText,
                descText,
                priceText,
                buyButton,
                buyText,
                itemImage,
                imageContainer
            });
        });
    }
    
    async purchaseItem(item) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            // Calling backend for purchasing item
            const API_URL = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API_URL}/items/${item._id}/purchase`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to purchase item');
            }
            
            if (data.success && data.data) {
                const globalContext = getGlobalContext();
                if (globalContext) {
                    globalContext.updateUserData({
                        coins: data.data.coins,
                        inventory: data.data.inventory
                    });
                    
                    // Local coins balance
                    this.userCoins = data.data.coins;
                    this.updateCoinsDisplay();
                    
                    // Success message
                    this.showPurchaseSuccess(item);
                    
                    this.displayItems();
                }
            }
        } catch (err) {
            console.error('Error purchasing item:', err);
            this.showError(err.message);
        }
    }
    
    showPurchaseSuccess(item) {
        const { width, height } = this.scene.scale;
        const successMsg = this.scene.add.text(
            width / 2,
            height * 0.4,
            `Purchased: ${item.displayName || item.name}!`,
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '20px',
                color: '#ffffff',
                backgroundColor: '#44aa44',
                padding: { left: 20, right: 20, top: 10, bottom: 10 }
            }
        ).setOrigin(0.5);
        
        successMsg.setDepth(1001);
        
        this.scene.tweens.add({
            targets: successMsg,
            alpha: 0,
            y: height * 0.3,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => successMsg.destroy()
        });
    }
    
    showError(message) {
        this.loadingText.setVisible(false);
        this.errorText.setText(message);
        this.errorText.setVisible(true);
        
        this.scene.time.delayedCall(3000, () => {
            this.errorText.setVisible(false);
        });
    }
    
    close() {
        this.container.destroy();
        this.onClose();
    }
} 