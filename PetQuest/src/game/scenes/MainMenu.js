import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import Phaser from 'phaser';
import { getGlobalContext } from '../../utils/contextBridge';
import { InventoryModal } from './InventoryModal';
import { Pet } from '../entities/Pet';

export class MainMenu extends Scene {
    logoTween;
    background;
    pet;
    username;

    constructor() {
        super('MainMenu');
    }

    init(data) {
        // Get context data
        const globalContext = getGlobalContext();
        if (globalContext) {
            this.username = globalContext.userData.username || 'Player';
            this.petData = globalContext.userData.selectedPet;
            
            // Log user data including coins
            console.log(`MainMenu - User data loaded:`, {
                username: this.username,
                coins: globalContext.userData.coins,
                hasSelectedPet: globalContext.userData.hasSelectedPet
            });
            
            // Log which pet is being loaded
            if (this.petData) {
                console.log(`Loading pet in MainMenu: ${this.petData.name}`);
            } else {
                console.warn('No pet data found in MainMenu');
            }
        } else {
            // Fallback if context is not available
            this.username = data.username || 'Player';
            console.warn('MainMenu - No global context available');
        }
    }

    create() {
        this.setupBackground();
        this.setupUI();
        this.setupPet();
        
        // Fetch inventory data when the scene loads
        const globalContext = getGlobalContext();
        if (globalContext) {
            console.log('Fetching inventory at MainMenu initialization');
            globalContext.fetchInventory()
                .then(() => console.log('Inventory loaded in MainMenu'))
                .catch(err => console.error('Error loading inventory in MainMenu:', err));
        }
        
        // Check initial orientation and setup UI accordingly
        const width = this.scale.width;
        const height = this.scale.height;
        const isPortrait = height > width;
        
        // Apply appropriate layout based on orientation
        if (isPortrait) {
            this.setupPortraitLayout();
        } else {
            this.setupLandscapeLayout();
        }
        
        EventBus.emit('current-scene-ready', this);
    }

    // Add wake method to refresh pet data when returning from other scenes
    wake() {
        console.log('MainMenu waking up - refreshing pet data');
        
        // Get global context
        const globalContext = getGlobalContext();
        const shouldRefresh = globalContext?.userData?.shouldRefreshPet || false;
        
        if (shouldRefresh) {
            console.log('Force refresh flag detected, fetching fresh pet data');
            // Reset the flag immediately
            if (globalContext) {
                globalContext.userData.shouldRefreshPet = false;
            }
        }
        
        // Always refresh when waking up to ensure data is current
        this.refreshPetData().then(() => {
            // Refresh UI with updated pet data
            this.refreshUI();
        }).catch(err => {
            console.error('Error refreshing pet data:', err);
        });
    }

    // Method to fetch latest pet data from backend
    async refreshPetData() {
        try {
            const token = localStorage.getItem('token');
            const globalContext = getGlobalContext();
            
            if (!token || !globalContext || !globalContext.userData || !globalContext.userData.selectedPet) {
                console.warn('Cannot refresh pet: missing token or pet data');
                return;
            }
            
            const API_URL = import.meta.env.VITE_API_URL;
            const petId = globalContext.userData.selectedPet._id;
            
            console.log('Refreshing pet data from backend for pet:', petId);
            
            // Fetch latest pet data from backend
            const response = await fetch(`${API_URL}/pets/${petId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const responseData = await response.json();
            
            if (response.ok && responseData.success) {
                console.log('Pet data refreshed:', responseData.data);
                
                // Update global context with the refreshed pet data
                if (globalContext && globalContext.userData) {
                    globalContext.userData.selectedPet = responseData.data;
                }
                
                // Update local reference
                this.petData = responseData.data;
                
                console.log('Pet stats updated in MainMenu:', 
                    'HP:', this.petData.currentHP, 
                    'SP:', this.petData.currentSP,
                    'EXP:', this.petData.experience);
                
                return responseData.data;
            } else {
                console.error('Failed to refresh pet data:', responseData.error || 'Unknown error');
                return null;
            }
        } catch (error) {
            console.error('Error refreshing pet data:', error.message);
            return null;
        }
    }

    // method for setting up the background
    setupBackground() {
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        
        this.background = this.add.image(centerX, centerY, 'background');
        this.scaleToFit(this.background);
        this.background.setDepth(0);
    }

    // method for setting up the user interface for the main menu
    setupUI() {
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        
        // Welcome message - set to much larger size
        const welcomeText = this.add.text(
            centerX, 
            height * 0.05, 
            `Welcome back, ${this.username}!`, 
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: this.getResponsiveFontSize(4, 'em'),
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 5
            }
        )
        welcomeText.setOrigin(0.5, 0);
        
        // Remove start game button
        // Move battle button to bottom right and make it start the game
        const buttonWidth = Math.min(width * 0.4, 200);
        const buttonHeight = 60;
        const battleButtonX = width - buttonWidth / 2 - 30;
        const battleButtonY = height - buttonHeight / 2 - 30;
        const battleButton = this.add.graphics();
        battleButton.fillRoundedRect(
            battleButtonX - buttonWidth/2, 
            battleButtonY - buttonHeight/2, 
            buttonWidth, 
            buttonHeight, 
            16
        );
        battleButton.strokeRoundedRect(
            battleButtonX - buttonWidth/2, 
            battleButtonY - buttonHeight/2, 
            buttonWidth, 
            buttonHeight, 
            16
        );
        battleButton.setInteractive(new Phaser.Geom.Rectangle(
            battleButtonX - buttonWidth/2,
            battleButtonY - buttonHeight/2,
            buttonWidth,
            buttonHeight
        ), Phaser.Geom.Rectangle.Contains);
        
        // Battle button text
        const battleButtonText = this.add.text(
            battleButtonX,
            battleButtonY,
            'BATTLE',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: this.getResponsiveFontSize(2, 'rem'),
                color: '#ff5555',
                stroke: '#000000',
                strokeThickness: Math.min(8, Math.max(4, width / 100))
            }
        )
        battleButtonText.setOrigin(0.5);
        
        // Battle button animation
        this.tweens.add({
            targets: battleButtonText,
            scale: 1.1,
            yoyo: true,
            repeat: -1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });
        
        battleButton.on('pointerdown', () => {
            // Add click animation
            this.tweens.add({
                targets: battleButtonText,
                scale: 0.9,
                duration: 100,
                yoyo: true,
                onComplete: () => this.changeScene()
            });
        });
        
        // Store UI elements
        this.ui = { welcomeText, battleButton, battleButtonText };
    }

    // method for setting up the pet sprite
    setupPet() {
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        if (!this.petData) {
            console.warn('No pet data available to display');
            return;
        }
        console.log('Setting up pet with data:', this.petData);
        // Experience bar above pet
        const exp = this.petData.experience || 0;
        const nextLevelXP = (this.petData.level || 1) * (this.petData.level || 1) * 100;
        const expBarY = height * 0.6; // Above the pet name
        const expBarWidth = Math.min(width * 0.4, 260);
        const expBarX = width * 0.5 - expBarWidth / 2;
        // Bar background
        this.expBarBg = this.add.rectangle(expBarX, expBarY, expBarWidth, 14, 0x333366).setOrigin(0, 0.5);
        // Bar fill
        const fillWidth = Math.max(0, Math.min(1, exp / nextLevelXP)) * expBarWidth;
        this.expBarFill = this.add.rectangle(expBarX, expBarY, fillWidth, 14, 0x44e0ff).setOrigin(0, 0.5);
        // Exp text
        this.expBarText = this.add.text(width * 0.5, expBarY, `EXP: ${exp}/${nextLevelXP}`, {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '16px',
            color: '#88ffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5, 0.5);
        // Create pet using the Pet class
        this.pet = new Pet(this, this.petData, centerX, height * 0.5);
        // Calculate pet scale based on screen size
        const baseScale = Math.min(width, height) * 0.002;
        // Create the sprite
        this.pet.create(baseScale, 1);
        // Create interactive name display with rename button
        this.pet.createInteractiveNameDisplay(-height * 0.13, () => this.showRenameDialog());
        // --- Custom Panels ---
        this.createLeftStatsPanel();
        this.createRightAttributesPanel();
        this.setupInteractionButtons();
    }

    // Create left panel for stats and level
    createLeftStatsPanel() {
        if (this.leftStatsPanel) this.leftStatsPanel.destroy();
        const { width, height } = this.scale;
        const panelWidth = Math.min(260, width * 0.28);
        const panelX = panelWidth * 0.5 + 10;
        const panelY = height * 0.5;
        this.leftStatsPanel = this.add.container(panelX, panelY);
        // Title
        const title = this.add.text(0, -90, 'PET STATS', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '22px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.leftStatsPanel.add(title);
        // Level
        const level = (this.petData.level !== undefined) ? this.petData.level : '-';
        const levelText = this.add.text(-panelWidth/2 + 16, -60, `Level: ${level}`, {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '18px',
            color: '#ffff88',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 0.5);
        this.leftStatsPanel.add(levelText);
        // Stats
        const statConfig = [
            { key: 'hp', label: 'HP' },
            { key: 'sp', label: 'SP' },
            { key: 'atk', label: 'ATK' },
            { key: 'def', label: 'DEF' }
        ];
        const stats = this.petData.stats || {};
        
        // Use currentHP/currentSP if available, else fallback to stats.hp/stats.sp
        // For max values, use maxhp/maxsp if available, otherwise use stats.hp/stats.sp
        const currentHP = this.petData.currentHP !== undefined ? this.petData.currentHP : stats.hp;
        const maxHP = this.petData.maxhp !== undefined ? this.petData.maxhp : stats.hp;
        const currentSP = this.petData.currentSP !== undefined ? this.petData.currentSP : stats.sp;
        const maxSP = this.petData.maxsp !== undefined ? this.petData.maxsp : stats.sp;
        
        statConfig.forEach((stat, i) => {
            const yOffset = -30 + i * 36;
            let value = (stats[stat.key] !== undefined) ? stats[stat.key] : '-';
            let displayStr = `${value}`;
            let color = '#ffffff';
            if (stat.key === 'hp') {
                displayStr = `${currentHP}/${maxHP}`;
                if (currentHP < maxHP) color = '#ff8888';
            } else if (stat.key === 'sp') {
                displayStr = `${currentSP}/${maxSP}`;
                if (currentSP < maxSP) color = '#ff8888';
            }
            // Buffs
            let buffValue = 0;
            const now = new Date().getTime();
            const hasActiveBuffs = this.petData.activeBuffs && 
                this.petData.activeBuffs.expiresAt && 
                new Date(this.petData.activeBuffs.expiresAt).getTime() > now;
            if (hasActiveBuffs && 
                this.petData.activeBuffs.stats && 
                this.petData.activeBuffs.stats[stat.key]) {
                buffValue = this.petData.activeBuffs.stats[stat.key];
            }
            let baseText = `${stat.label}: `;
            if (buffValue > 0) {
                const mainText = this.add.text(
                    -panelWidth / 2 + 16,
                    yOffset,
                    baseText + displayStr,
                    {
                        fontFamily: '"Silkscreen", cursive',
                        fontSize: '18px',
                        color,
                        stroke: '#000000',
                        strokeThickness: 2
                    }
                ).setOrigin(0, 0.5);
                const buffText = this.add.text(
                    -panelWidth / 2 + 16 + mainText.width,
                    yOffset,
                    ` +${buffValue}`,
                    {
                        fontFamily: '"Silkscreen", cursive',
                        fontSize: '18px',
                        color: '#00ff00',
                        stroke: '#000000',
                        strokeThickness: 2
                    }
                ).setOrigin(0, 0.5);
                this.leftStatsPanel.add([mainText, buffText]);
            } else {
                const statText = this.add.text(
                    -panelWidth / 2 + 16,
                    yOffset,
                    baseText + displayStr,
                    {
                        fontFamily: '"Silkscreen", cursive',
                        fontSize: '18px',
                        color,
                        stroke: '#000000',
                        strokeThickness: 2
                    }
                ).setOrigin(0, 0.5);
                this.leftStatsPanel.add(statText);
            }
        });
    }

    // Create right panel for attributes
    createRightAttributesPanel() {
        if (this.rightAttributesPanel) this.rightAttributesPanel.destroy();
        const { width, height } = this.scale;
        const panelWidth = Math.min(260, width * 0.28);
        const panelX = width - panelWidth * 0.5 - 10;
        const panelY = height * 0.5;
        this.rightAttributesPanel = this.add.container(panelX, panelY);
        // No background
        // Title
        const title = this.add.text(0, -90, 'ATTRIBUTES', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '22px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.rightAttributesPanel.add(title);
        // Attributes
        const attributes = this.petData.attributes || {};
        const attrConfig = [
            { key: 'happiness', label: 'Happiness', color: 0xffe066 },
            { key: 'hunger', label: 'Fullness', color: 0x66b3ff },
            { key: 'stamina', label: 'Stamina', color: 0x99ff99 }
        ];
        let shown = false;
        // Calculate panel height based on number of shown attributes (always show at least 1 row)
        const attrRowHeight = 48;
        const shownAttrCount = attrConfig.filter(attr => attributes[attr.key] !== undefined).length;
        const attrCount = Math.max(shownAttrCount, 1); // Always at least 1 row
        const topPadding = 56;
        const bottomPadding = 32;
        const panelHeight = topPadding + 40 + attrRowHeight * attrCount + bottomPadding;
        attrConfig.forEach((attr, i) => {
            if (attributes[attr.key] !== undefined) {
                shown = true;
                // Add extra top padding for the first row
                const yOffset = -panelHeight/2 + 40 + topPadding + i * attrRowHeight;
                // Label
                const label = this.add.text(-panelWidth/2 + 16, yOffset, attr.label, {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '18px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2
                }).setOrigin(0, 0.5);
                // Bar background (with padding above bar)
                const barY = yOffset + 24; // 24px below label (18px label + 6px padding)
                const barBg = this.add.rectangle(-panelWidth/2 + 16, barY, 180, 16, 0x333333).setOrigin(0, 0.5);
                // Bar fill
                let value = Math.max(0, Math.min(100, attributes[attr.key]));
                
                // For hunger, invert the display (0 hunger = full bar, 100 hunger = empty bar)
                if (attr.key === 'hunger') {
                    // Invert the value for display purposes only
                    value = 100 - value;
                }
                
                const barWidth = (value / 100) * 180;
                const barFill = this.add.rectangle(-panelWidth/2 + 16, barY, barWidth, 16, attr.color).setOrigin(0, 0.5);
                this.rightAttributesPanel.add([label, barBg, barFill]);
            }
        });
        if (!shown) {
            const noAttr = this.add.text(0, 0, 'No attributes', {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#cccccc',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            this.rightAttributesPanel.add(noAttr);
        }
    }

    // Scale background to fit screen
    scaleToFit(gameObject) {
        const { width, height } = this.scale;
        const scaleX = width / gameObject.width;
        const scaleY = height / gameObject.height;
        const scale = Math.max(scaleX, scaleY);
        gameObject.setScale(scale).setScrollFactor(0);
    }

    changeScene() {
        // Add scene transition effect
        this.cameras.main.fadeOut(500, 0, 0, 0);
        
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Start the game scene with level data
            this.scene.start('LevelSelector', { 
                pet: this.petData,
                username: this.username
            });

        });
    }

    // Helper method to calculate responsive font sizes
    getResponsiveFontSize(baseSize, unit = 'px') {
        const { width } = this.scale;
        const baseWidth = 1280; // Base design width
        const scaleFactor = Math.min(width / baseWidth, 1.5); // Limit scaling to 150%
        const minScale = 0.5; // Minimum scale factor to ensure text isn't too small
        
        const finalScale = Math.max(scaleFactor, minScale);
        return `${baseSize * finalScale}${unit}`;
    }

    // Example of updating context from a Phaser scene
    collectCoins(amount) {
        const globalContext = getGlobalContext();
        if (globalContext) {
            globalContext.addCoins(amount);
            console.log(`Added ${amount} coins. Total: ${globalContext.userData.coins}`);
        }
    }

    setupPortraitLayout() {
        const { width, height } = this.scale;
        
        // Example: Reposition elements for portrait orientation
        if (this.pet) {
            this.pet.setPosition(width / 2, height * 0.75);
        }
        
        // Other UI adjustments...
    }

    setupLandscapeLayout() {
        const { width, height } = this.scale;
        
        // Example: Default landscape layout
        if (this.pet) {
            this.pet.setPosition(width / 2, height * 0.7);
        }
        
        // Other UI adjustments...
    }

    setupTouchControls() {
        const { width, height } = this.scale;
        
        // Add touch controls here if needed
        // For example, virtual joystick for movement
        // You might want to use plugins like rexvirtualjoystickplugin
        
        // Example: Add a touch area for basic interaction
        const touchArea = this.add.rectangle(width/2, height/2, width, height)
            .setOrigin(0.5)
            .setInteractive()
            .setAlpha(0.001);
            
        touchArea.on('pointerdown', () => {
            // Handle touch input
        });
    }

    // Show dialog to rename pet
    showRenameDialog() {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        // Try to create the DOM input element
        try {
            // Create a semi-transparent background
            const overlay = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.7)
                .setOrigin(0)
                .setDepth(10)
                .setInteractive(); // Block interactions below

            // Create dialog box dimensions
            const dialogWidth = Math.min(width * 0.8, 400);
            const dialogHeight = 200;
            const dialogTopLeftX = centerX - dialogWidth / 2;
            const dialogTopLeftY = centerY - dialogHeight / 2;

            const dialog = this.add.rectangle(dialogTopLeftX, dialogTopLeftY, dialogWidth, dialogHeight, 0x333333)
                .setStrokeStyle(2, 0xffffff)
                .setOrigin(0, 0) // Set origin to top-left
                .setDepth(11);

            // Add title (Positioned relative to dialog top-center)
            const titleY = dialogTopLeftY + 30; // 30px padding from top
            const title = this.add.text(centerX, titleY, 'Rename Your Pet', {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5, 0) // Center horizontally, align top vertically
              .setDepth(11);

            // Add input field (Positioned relative to dialog center)
            const inputY = centerY; // Vertically centered within the dialog space
            const input = this.add.dom(centerX - 40, inputY, 'input')
                .setDepth(11);

            // Style input
            const inputElement = input.node;
            inputElement.style.width = '250px';
            inputElement.style.height = '36px';
            inputElement.style.fontSize = '20px';
            inputElement.style.padding = '4px 10px';
            inputElement.style.borderRadius = '5px';
            inputElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            inputElement.style.color = 'white';
            inputElement.style.border = '2px solid #4a9e2f';
            inputElement.style.textAlign = 'center'; // Add this line
            inputElement.maxLength = 20;
            inputElement.value = this.pet.data.name;
            inputElement.focus();

            // Add buttons (Positioned relative to dialog bottom-center)
            const buttonY = dialogTopLeftY + dialogHeight - 30; // 50px padding from bottom
            const buttonSpacing = 70; // Spacing from center

            // Cancel button
            const cancelButtonX = centerX - buttonSpacing;
            const cancelButton = this.add.rectangle(cancelButtonX, buttonY, 120, 40, 0x880000)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true })
                .setOrigin(0.5, 0.5) // Center the rectangle itself
                .setDepth(11);

            const cancelText = this.add.text(cancelButtonX, buttonY, 'CANCEL', {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5, 0.5) // Center text on the button
              .setDepth(11);

            // Close dialog when cancel is clicked
            cancelButton.on('pointerdown', () => {
                overlay.destroy();
                dialog.destroy();
                title.destroy();
                input.destroy();
                cancelButton.destroy();
                cancelText.destroy();
                confirmButton.destroy();
                confirmText.destroy();
            });

            // Confirm button
            const confirmButtonX = centerX + buttonSpacing;
            const confirmButton = this.add.rectangle(confirmButtonX, buttonY, 120, 40, 0x008800)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true })
                .setOrigin(0.5, 0.5) // Center the rectangle itself
                .setDepth(11);

            const confirmText = this.add.text(confirmButtonX, buttonY, 'SAVE', {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5, 0.5) // Center text on the button
              .setDepth(11);

            // Handle rename when confirm is clicked
            confirmButton.on('pointerdown', async () => {
                const newName = inputElement.value.trim();

                if (newName && newName !== this.pet.data.name) {
                    await this.renamePet(newName);
                }

                // Close dialog
                overlay.destroy();
                dialog.destroy();
                title.destroy();
                input.destroy();
                cancelButton.destroy();
                cancelText.destroy();
                confirmButton.destroy();
                confirmText.destroy();
            });
        } catch (error) {
            console.error('Error creating DOM input for rename dialog:', error);
            // Fallback to simple prompt
            this.showFallbackRenameDialog();
        }
    }
    
    // Fallback rename dialog using browser prompt
    showFallbackRenameDialog() {
        const newName = prompt('Enter new name for your pet:', this.pet.data.name);
        if (newName && newName.trim() && newName.trim() !== this.pet.data.name) {
            this.renamePet(newName.trim());
        }
    }
    
    // Send request to rename pet
    async renamePet(newName) {
        try {
            const token = localStorage.getItem('token');
            if (!token || !this.pet.data || !this.pet.data._id) {
                console.error('Cannot rename pet: missing token or pet ID');
                return;
            }
            
            const API_URL = import.meta.env.VITE_API_URL;
            
            // Send rename request to server
            const response = await fetch(`${API_URL}/pets/${this.pet.data._id}/rename`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName })
            });
            
            const responseData = await response.json();
            
            if (response.ok && responseData.success) {
                console.log('Pet renamed successfully:', responseData.data);
                
                // Update pet name using the Pet class method
                this.pet.setName(newName);
                
                // Update global context
                const globalContext = getGlobalContext();
                if (globalContext && globalContext.userData.selectedPet) {
                    globalContext.userData.selectedPet.name = newName;
                }
            } else {
                console.error('Failed to rename pet:', responseData.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error renaming pet:', error.message);
        }
    }

    // Add this new function to set up interaction buttons
    setupInteractionButtons() {
        const { width, height } = this.scale;
        const buttonSize = Math.min(width * 0.12, 70); // Size of the button
        const buttonSpacing = buttonSize * 1.3; // Spacing between buttons

        const buttons = [
            { key: 'feed', icon: 'pet_feed', handler: this.handleFeed, anim: 'feed', label: 'Feed' },
            { key: 'play', icon: 'pet_play', handler: this.handlePlay, anim: 'play', label: 'Play' },
            { key: 'train', icon: 'pet_train', handler: this.handleTrain, anim: 'train', label: 'Train' },
            { key: 'medicine', icon: 'pet_addHealth', handler: this.handleMedicine, anim: 'medicine', label: 'Medicine' },
            { key: 'outdoor', icon: 'pet_outdoor', handler: this.handleOutdoor, anim: 'outdoor', label: 'Outdoor' },
            { key: 'inventory', icon: 'inventory_btn', handler: this.handleInventory, anim: null, label: 'Inventory' },
            { key: 'shop', icon: 'shop_btn', handler: this.handleShop, anim: null, label: 'Shop' }
        ];

        const totalButtons = buttons.length;
        const totalWidth = totalButtons * buttonSize + (totalButtons - 1) * (buttonSpacing - buttonSize);
        const startX = (width - totalWidth) / 2 + buttonSize / 2;
        const bottomY = height - buttonSize / 2 - 20; // Position from bottom

        this.interactionButtons = [];
        this.interactionButtonLabels = [];

        buttons.forEach((btnConfig, index) => {
            const buttonX = startX + index * buttonSpacing;
            const button = this.add.sprite(buttonX, bottomY, btnConfig.icon)
                .setDisplaySize(buttonSize, buttonSize)
                .setInteractive({ useHandCursor: true })
                .setDepth(5);

            // Create label (hidden by default)
            const label = this.add.text(buttonX, bottomY - buttonSize / 2 - 10, btnConfig.label, {
                fontFamily: 'Silkscreen, cursive',
                fontSize: `${Math.round(buttonSize * 0.35)}px`,
                color: '#fff',
                stroke: '#000',
                strokeThickness: 3,
                backgroundColor: 'rgba(0,0,0,0.7)'
            })
            .setOrigin(0.5, 1)
            .setAlpha(0)
            .setDepth(10);

            button.on('pointerover', () => {
                label.setAlpha(1);
            });
            button.on('pointerout', () => {
                label.setAlpha(0);
            });

            button.on('pointerdown', () => {
                // Simple feedback animation
                this.tweens.add({
                    targets: button,
                    scale: 0.9,
                    duration: 100,
                    yoyo: true,
                    onComplete: () => {
                        // Only call the handler to show the modal
                        // Animation will be played only if an item is selected
                        btnConfig.handler.call(this); 
                    }
                });
            });

            this.interactionButtons.push(button);
            this.interactionButtonLabels.push(label);
        });
    }

    // Add handler functions for each button
    async handleFeed() {
        console.log('Feed button clicked');
        
        // Check if the pet is already full (hunger = 0)
        if (this.petData.attributes.hunger <= 0) {
            this.showToast('Pet is already full!');
            return;
        }
        
        // Check if stamina is already full
        if (this.petData.attributes.stamina >= 100) {
            this.showToast('Stamina already full!');
            return;
        }
        
        // Show inventory modal for food selection
        const modal = new InventoryModal(this, {
            actionType: 'feed',
            onItemSelect: async (itemId) => {
                try {
                    // Play animation when item is selected
                    if (this.pet && typeof this.pet.playAnimation === 'function') {
                        this.pet.playAnimation('feed');
                    }
                    
                    // Use the selected item for feeding
                    const result = await this.updatePetInteraction('feed', { itemId });
                    
                    if (result) {
                        this.showToast('Pet fed with special food!');
                    }
                } catch (error) {
                    console.error('Failed to feed pet with item:', error);
                    this.showToast('Could not feed pet with this item');
                }
            },
            onClose: () => {
                // Do nothing when modal is closed without selecting an item
                console.log('Feed canceled');
            }
        });
        
        modal.show();
    }

    async handlePlay() {
        console.log('Play button clicked');
        
        // Show inventory modal for toy selection
        const modal = new InventoryModal(this, {
            actionType: 'play',
            onItemSelect: async (itemId) => {
                try {
                    // Play animation when item is selected
                    if (this.pet && typeof this.pet.playAnimation === 'function') {
                        this.pet.playAnimation('play');
                    }
                    
                    // Use the selected toy for playing
                    const result = await this.updatePetInteraction('play', { itemId });
                    
                    if (result) {
                        this.showToast('Pet played with special toy!');
                    }
                } catch (error) {
                    console.error('Failed to play with pet using item:', error);
                    this.showToast('Could not use this toy');
                }
            },
            onClose: () => {
                // Do nothing when modal is closed without selecting an item
                console.log('Play canceled');
            }
        });
        
        modal.show();
    }

    async handleTrain() {
        console.log('Train button clicked');
        
        // Check if pet has enough stamina
        if (this.petData.attributes && this.petData.attributes.stamina < 10) {
            this.showToast('Not enough stamina to train!');
            return;
        }
        
        // Show inventory modal for equipment selection
        const modal = new InventoryModal(this, {
            actionType: 'train',
            onItemSelect: async (itemId) => {
                try {
                    // Play animation when item is selected
                    if (this.pet && typeof this.pet.playAnimation === 'function') {
                        this.pet.playAnimation('train');
                    }
                    
                    // Use the selected equipment for training
                    const result = await this.updatePetInteraction('train', { itemId });
                    
                    if (result && result.levelUp) {
                        this.showToast(`Pet trained with special equipment and leveled up to ${this.petData.level}!`);
                    } else if (result) {
                        this.showToast('Pet trained with special equipment! Extra experience gained!');
                    }
                } catch (error) {
                    console.error('Failed to train pet with equipment:', error);
                    this.showToast('Could not use this equipment for training');
                }
            },
            onClose: () => {
                // Do nothing when modal is closed without selecting an item
                console.log('Train canceled');
            }
        });
        
        modal.show();
    }

    async handleMedicine() {
        console.log('Medicine button clicked');
        
        // Get current HP and SP or default to full if undefined
        const currentHP = this.petData.currentHP !== undefined ? 
            this.petData.currentHP : this.petData.stats.hp;
        const currentSP = this.petData.currentSP !== undefined ? 
            this.petData.currentSP : this.petData.stats.sp;
        const maxHP = this.petData.stats.hp;
        const maxSP = this.petData.stats.sp;
        
        // Check if both HP and SP are already full
        if (currentHP >= maxHP && currentSP >= maxSP) {
            this.showToast('HP and SP already full!');
            return;
        }
        
        // Show inventory modal for medicine selection
        const modal = new InventoryModal(this, {
            actionType: 'medicine',
            onItemSelect: async (itemId) => {
                try {
                    // Get the item details from context
                    const globalContext = getGlobalContext();
                    
                    console.log('Selected item ID:', itemId);
                    
                    // Find the item in the inventory
                    const inventory = globalContext.userData.inventory || [];
                    const inventoryItem = inventory.find(entry => entry.item._id === itemId);
                    
                    if (!inventoryItem || !inventoryItem.item) {
                        console.error('Item not found in inventory');
                        this.showToast('Item not available');
                        return;
                    }
                    
                    const item = inventoryItem.item;
                    console.log('Found item:', item);
                    
                    // Check if this is an HP potion and HP is already full
                    if (item.name === 'hp-potion' && currentHP >= maxHP) {
                        this.showToast('Pet already at full HP!');
                        return;
                    }
                    
                    // Check if this is an SP potion and SP is already full
                    if (item.name === 'sp-potion' && currentSP >= maxSP) {
                        this.showToast('Pet already at full SP!');
                        return;
                    }
                    
                    // Play animation when item is selected and will be used
                    if (this.pet && typeof this.pet.playAnimation === 'function') {
                        this.pet.playAnimation('medicine');
                    }
                    
                    // Use the selected medicine for healing
                    const result = await this.updatePetInteraction('medicine', { itemId });
                    
                    if (result) {
                        // Get updated values
                        const newHP = result.data.currentHP || maxHP;
                        const newSP = result.data.currentSP || maxSP;
                        
                        // Calculate healing amounts
                        const healHPAmount = Math.floor(newHP - currentHP);
                        const healSPAmount = Math.floor(newSP - currentSP);
                        
                        // Create appropriate message based on what was healed
                        let message = 'Pet healed with medicine!';
                        if (healHPAmount > 0 && healSPAmount > 0) {
                            message = `Pet healed with mixed potion! +${healHPAmount} HP +${healSPAmount} SP`;
                        } else if (healHPAmount > 0) {
                            message = `Pet healed with HP potion! +${healHPAmount} HP`;
                        } else if (healSPAmount > 0) {
                            message = `Pet healed with SP potion! +${healSPAmount} SP`;
                        } else if (newHP >= maxHP && newSP >= maxSP) {
                            message = 'Pet fully restored with best potion!';
                        }
                        
                        this.showToast(message);
                    }
                } catch (error) {
                    console.error('Failed to heal pet with medicine:', error);
                    this.showToast('Could not use this medicine');
                }
            },
            onClose: () => {
                // Do nothing when modal is closed without selecting an item
                console.log('Medicine canceled');
            }
        });
        
        modal.show();
    }

    async handleOutdoor() {
        console.log('Outdoor button clicked');
        
        // Play animation immediately
        if (this.pet && typeof this.pet.playAnimation === 'function' && this.petData.attributes.stamina >= 50) {
            this.pet.playAnimation('outdoor');
        }
        
        // Check if pet already has active buffs
        if (this.petData.activeBuffs && this.petData.activeBuffs.expiresAt > new Date().getTime()) {
            const timeRemaining = Math.ceil((this.petData.activeBuffs.expiresAt - new Date().getTime()) / 60000);
            this.showToast(`Buff still active for ${timeRemaining} minutes!`);
            return;
        }

        // Check if pet has enough stamina
        if (this.petData.attributes && this.petData.attributes.stamina < 50) {
            this.showToast('Not enough stamina for outdoor activity!');
            return;
        }
        
        try {
            const result = await this.updatePetInteraction('outdoor', {
                hungerIncrease: 30,
                staminaDecrease: 50,
                buffDuration: 120 // 2 hours in minutes
            });
            
            if (result && result.buffDetails) {
                // Format the buff message with actual values
                if (result.data && result.data.activeBuffs && result.data.activeBuffs.stats) {
                    const buffs = result.data.activeBuffs.stats;
                    let buffMessage = '';
                    
                    // Create a detailed buff message showing actual values
                    Object.entries(buffs).forEach(([stat, value]) => {
                        if (value > 0) {
                            buffMessage += `${stat.toUpperCase()}+${value} `;
                        }
                    });
                    
                    this.showToast(`Pet went outside! ${buffMessage.trim()} for 2 hours`);
                } else {
                    // Fallback to the old format
                    const buffedStats = result.buffDetails.buffedStats.join(', ').toUpperCase();
                    this.showToast(`Pet went outside! +10% ${buffedStats} for 2 hours`);
                }
            }
        } catch (error) {
            console.error('Error taking pet outdoors:', error);
            this.showToast('Could not take pet outdoors');
        }
    }

    async handleInventory() {
        console.log('Inventory button clicked');

        const modal = new InventoryModal(this, {
            actionType: 'view',
            onItemSelect: () => {}, // Just view, no select behavior
            onClose: () => {
                console.log('Inventory closed');
            }
        });

        modal.show();
    }

    async handleShop() {
        console.log('Shop button clicked');
        
        // Import the ShopModal dynamically
        const { ShopModal } = await import('./ShopModal');
        
        // Create shop modal for all items first (default)
        const modal = new ShopModal(this, {
            itemType: null, // Show all items initially
            onClose: () => {
                console.log('Shop closed');
            }
        });
        
        modal.show();
    }

    // Show a temporary toast message to the user
    showToast(message, duration = 2000) {
        const { width, height } = this.scale;
        
        // Remove existing toast if any
        if (this.toast) {
            this.toast.destroy();
        }
        
        // Create toast background
        const toastBg = this.add.rectangle(
            width / 2,
            height * 0.2,
            width * 0.6,
            50,
            0x000000,
            0.7
        ).setOrigin(0.5);
        
        // Create toast text
        const toastText = this.add.text(
            width / 2,
            height * 0.2,
            message,
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Group toast elements
        this.toast = this.add.container(0, 0, [toastBg, toastText]);
        this.toast.setDepth(100);
        
        // Fade in
        this.toast.setAlpha(0);
        this.tweens.add({
            targets: this.toast,
            alpha: 1,
            duration: 200,
            ease: 'Power1',
            onComplete: () => {
                // Auto-hide after duration
                this.time.delayedCall(duration, () => {
                    if (this.toast) {
                        this.tweens.add({
                            targets: this.toast,
                            alpha: 0,
                            duration: 200,
                            ease: 'Power1',
                            onComplete: () => {
                                if (this.toast) {
                                    this.toast.destroy();
                                    this.toast = null;
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    // Generic function to call backend
    async updatePetInteraction(action, data = {}) {
        try {
            const token = localStorage.getItem('token');
            if (!token || !this.petData || !this.petData._id) {
                console.error(`Cannot perform ${action}: missing token or pet ID`);
                return null;
            }

            const API_URL = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API_URL}/pets/${this.petData._id}/${action}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (response.ok && responseData.success) {
                console.log(`Pet ${action} successful:`, responseData.data);

                // Update local petData reference
                this.petData = responseData.data;
                
                // Update global context if available
                const globalContext = getGlobalContext();
                if (globalContext && globalContext.userData) {
                    globalContext.userData.selectedPet = this.petData;
                }
                
                // Refresh UI panels
                this.refreshUI();
                
                return responseData;
            } else {
                console.error(`Failed to ${action} pet:`, responseData.error || 'Unknown error');
                this.showToast(responseData.error || `Failed to ${action} pet`);
                return null;
            }
        } catch (error) {
            console.error(`Error during pet ${action}:`, error.message);
            this.showToast(`Error: ${error.message}`);
            return null;
        }
    }

    // Helper function to refresh UI elements after data change
    refreshUI() {
        if (!this.petData) return;

        // Refresh EXP Bar
        const exp = this.petData.experience || 0;
        const nextLevelXP = (this.petData.level || 1) * (this.petData.level || 1) * 100;
        const expBarWidth = Math.min(this.scale.width * 0.4, 260);
        const fillWidth = Math.max(0, Math.min(1, exp / nextLevelXP)) * expBarWidth;
        this.expBarFill.setSize(fillWidth, this.expBarFill.height);
        this.expBarText.setText(`EXP: ${exp}/${nextLevelXP}`);

        // Refresh Panels (recreate them with new data)
        this.createLeftStatsPanel();
        this.createRightAttributesPanel();

        // Update Pet Name display if it changed (though unlikely from interactions)
        if (this.pet && this.pet.data.name !== this.petData.name) {
            this.pet.setName(this.petData.name);
        }
         // Update Pet data reference within the Pet instance itself
         if (this.pet) {
            this.pet.data = this.petData;
         }
    }
}
