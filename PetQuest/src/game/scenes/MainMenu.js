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
    hasShownHappinessWarning = false;
    shouldShowPetLeftScreen = false;

    constructor() {
        super('MainMenu');
    }

    init(data) {
        // Get context data
        const globalContext = getGlobalContext();
        if (globalContext) {
            this.username = globalContext.userData.username || 'Player';
            this.petData = globalContext.userData.selectedPet;
            
            // Check for user-specific pet left flag
            const token = localStorage.getItem('token');
            const userId = this.getUserIdFromToken(token);
            const userSpecificFlag = userId ? localStorage.getItem(`petHasLeft_${userId}`) === 'true' : false;
            
            // Log user data including coins
            console.log(`MainMenu - User data loaded:`, {
                username: this.username,
                userId: userId || 'unknown',
                coins: globalContext.userData.coins,
                hasSelectedPet: globalContext.userData.hasSelectedPet,
                petHasLeft: globalContext.userData.petHasLeft || userSpecificFlag || false
            });
            
            // Check if pet has left flag is set, using user-specific localStorage flag or global context
            if (globalContext.userData.petHasLeft || userSpecificFlag) {
                console.log('Pet has left flag detected during init');
                
                // We'll set a flag to show the leaving screen after create
                this.shouldShowPetLeftScreen = true;
            }
            
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
        // Check if we should show the pet left screen immediately
        if (this.shouldShowPetLeftScreen) {
            console.log('Showing pet left screen on create');
            // Create minimal UI first
            this.setupBackground();
            
            // Then immediately show the pet left screen
            this.time.delayedCall(100, () => {
                this.showPetLeavingScreen();
            });
            return;
        }
        
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
        
        // Check happiness immediately after scene creation
        this.checkHappinessLevel();
        
        EventBus.emit('current-scene-ready', this);
    }

    // Add wake method to refresh pet data when returning from other scenes
    wake() {
        console.log('MainMenu waking up - refreshing pet data');
        
        // Get global context
        const globalContext = getGlobalContext();
        const shouldRefresh = globalContext?.userData?.shouldRefreshPet || false;
        const petIsLeaving = globalContext?.userData?.petIsLeaving || false;
        
        // Check if pet is leaving immediately (happiness = 0)
        if (petIsLeaving) {
            console.log('Pet is leaving flag detected, showing leaving screen');
            
            // Clear the flag immediately
            if (globalContext) {
                globalContext.userData.petIsLeaving = false;
            }
            
            // Always refresh data first to ensure we have the latest
            this.refreshPetData().then(() => {
                // Show the pet leaving screen
                this.showPetLeavingScreen();
            }).catch(err => {
                console.error('Error refreshing pet data:', err);
                // Show the pet leaving screen anyway
                this.showPetLeavingScreen();
            });
            
            return; // Stop here, don't do normal refresh
        }
        
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
            
            // Check happiness immediately after refreshing
            this.checkHappinessLevel();
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
                
                // Get max values for logging
                const maxHP = this.petData.stats.hp || 0;
                const maxSP = this.petData.stats.sp || 0;
                
                console.log('Pet stats updated in MainMenu:', 
                    'HP:', this.petData.currentHP, '/', maxHP, 
                    'SP:', this.petData.currentSP, '/', maxSP,
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
                onComplete: () => {
                    this.changeScene();
                }
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
        
        // Get current and max HP/SP values
        // For current values: prioritize currentHP/SP, fallback to stats.hp/sp
        // For max values: prioritize stats.hp/sp as the "full" values
        const maxHP = stats.hp || 100; // Default to 100 if undefined
        const maxSP = stats.sp || 100; // Default to 100 if undefined
        
        // If currentHP/SP is undefined or null, initialize it to stats.hp/sp (maxHP/maxSP)
        // This ensures we always have valid currentHP/SP values
        if (this.petData.currentHP === undefined || this.petData.currentHP === null) {
            console.log('Initializing undefined currentHP to maxHP:', maxHP);
            this.petData.currentHP = maxHP;
        }
        
        if (this.petData.currentSP === undefined || this.petData.currentSP === null) {
            console.log('Initializing undefined currentSP to maxSP:', maxSP);
            this.petData.currentSP = maxSP;
        }
        
        const currentHP = this.petData.currentHP;
        const currentSP = this.petData.currentSP;
        
        console.log('Pet stats in panel:', {
            currentHP, maxHP, currentSP, maxSP
        });
        
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
        // Check pet's stamina and fullness before allowing battle
        if (this.petData && this.petData.attributes) {
            const stamina = this.petData.attributes.stamina;
            const hunger = this.petData.attributes.hunger; // 0 is full, 100 is empty
            const fullness = 100 - hunger;

            if (stamina <= 10) {
                this.showToast('Your pet is too tired to battle! Needs more stamina.');
                return;
            }
            if (fullness <= 10) { // This means hunger is 90 or more
                this.showToast('Your pet is too hungry to battle! Needs to eat.');
                return;
            }
        } else {
            console.warn('Pet data or attributes not available to check for battle readiness.');
            // Allow proceeding if data is missing, or handle as an error
        }

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
        
        // Get current HP and SP values
        const maxHP = this.petData.stats.hp || 100;
        const maxSP = this.petData.stats.sp || 100;
        
        // Ensure currentHP/SP is initialized
        if (this.petData.currentHP === undefined || this.petData.currentHP === null) {
            this.petData.currentHP = maxHP;
        }
        
        if (this.petData.currentSP === undefined || this.petData.currentSP === null) {
            this.petData.currentSP = maxSP;
        }
        
        const currentHP = this.petData.currentHP;
        const currentSP = this.petData.currentSP;
        
        console.log('Medicine check - Pet stats:', {
            currentHP, maxHP, currentSP, maxSP
        });
        
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
                        this.pet.playAnimation('medicine', { itemName: item.name });
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

    // Check pet happiness level and show warning if needed
    checkHappinessLevel() {
        if (!this.petData || !this.petData.attributes || this.petData.attributes.happiness === undefined) {
            return;
        }

        const happiness = this.petData.attributes.happiness;
        
        // If happiness is 0, show goodbye screen and delete account
        if (happiness === 0) {
            this.showPetLeavingScreen();
            return;
        }
        
        // Show warning modal when happiness is at or below 50
        if (happiness <= 50) {
            // Only show once per session using a flag
            if (!this.hasShownHappinessWarning) {
                this.showHappinessWarningModal();
                this.hasShownHappinessWarning = true;
            }
        } else if (happiness > 50) {
            // Reset the flag if happiness goes above 50 again
            this.hasShownHappinessWarning = false;
        }
    }

    // Show warning modal for low happiness
    showHappinessWarningModal() {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;
        const petName = this.petData.name;

        // Create overlay
        const overlay = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.7)
            .setOrigin(0)
            .setDepth(10)
            .setInteractive();

        // Create dialog dimensions - increase height to accommodate content
        const dialogWidth = Math.min(width * 0.8, 450);
        const dialogHeight = 300; // Increased from 250 to 300
        const dialogTopLeftX = centerX - dialogWidth / 2;
        const dialogTopLeftY = centerY - dialogHeight / 2;

        // Create dialog background
        const dialog = this.add.rectangle(dialogTopLeftX, dialogTopLeftY, dialogWidth, dialogHeight, 0x333333)
            .setStrokeStyle(2, 0xff5555)
            .setOrigin(0, 0)
            .setDepth(11);

        // Add warning icon/image if available
        const iconSize = 40;
        const warningIcon = this.add.text(dialogTopLeftX + 30, dialogTopLeftY + 30, '⚠️', {
            fontSize: '32px'
        }).setOrigin(0, 0).setDepth(11);

        // Add title
        const title = this.add.text(dialogTopLeftX + 80, dialogTopLeftY + 30, 'WARNING!', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '28px',
            color: '#ff5555',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0, 0).setDepth(11);

        // Add message text - with more spacing
        const message1 = this.add.text(centerX, dialogTopLeftY + 90, 
            `If ${petName}'s happiness becomes 0, it will leave you.`, {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
            wordWrap: { width: dialogWidth - 60 }
        }).setOrigin(0.5, 0).setDepth(11);

        const message2 = this.add.text(centerX, dialogTopLeftY + 150, // Increased Y position for more spacing
            `Tips: Your pet will drop happiness if you brought it to battle. Try to buy toys to play with your pet!`, {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '16px',
            color: '#ffff88',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center', 
            wordWrap: { width: dialogWidth - 60 }
        }).setOrigin(0.5, 0).setDepth(11);

        // Add close button - moved down
        const buttonY = dialogTopLeftY + dialogHeight - 60; // Moved from 40 to 60px from bottom
        const closeButton = this.add.rectangle(centerX, buttonY, 120, 40, 0x880000)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5, 0.5)
            .setDepth(11);

        const closeText = this.add.text(centerX, buttonY, 'GOT IT', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5, 0.5).setDepth(11);

        // Close dialog when button is clicked
        closeButton.on('pointerdown', () => {
            overlay.destroy();
            dialog.destroy();
            warningIcon.destroy();
            title.destroy();
            message1.destroy();
            message2.destroy();
            closeButton.destroy();
            closeText.destroy();
        });
    }

    // Show the final screen when pet is leaving (happiness = 0)
    showPetLeavingScreen() {
        // Clear existing screen elements to only show happiness bar and message
        this.clearGameScreen();
        
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;
        const petName = this.petData ? this.petData.name : 'Your pet';
        
        // Create a dark background
        this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.9)
            .setOrigin(0)
            .setDepth(100);
            
        // Create a frame for the happiness bar
        const barWidth = Math.min(width * 0.7, 400);
        const barHeight = 30;
        const barX = centerX - barWidth / 2;
        const barY = height * 0.3;
        
        // Bar background (empty)
        this.add.rectangle(barX, barY, barWidth, barHeight, 0x333333)
            .setStrokeStyle(2, 0xffffff)
            .setOrigin(0, 0.5)
            .setDepth(101);
            
        // Bar fill (will be empty since happiness is 0)
        // Just showing the empty bar frame visually communicates the issue
            
        // Label for the bar
        this.add.text(barX, barY - 25, `${petName}'s Happiness: 0`, {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '18px',
            color: '#ff5555',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(101);
        
        // Sad emoji for visual impact
        this.add.text(centerX, height * 0.15, '😢', {
            fontSize: '50px'
        }).setOrigin(0.5).setDepth(101);
        
        // Create title text
        const title = this.add.text(centerX, height * 0.4, `${petName} HAS LEFT YOU`, {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '32px',
            color: '#ff5555',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(101);
        
        // Create educational message
        const messageBox = this.add.rectangle(centerX, height * 0.6, width * 0.8, height * 0.3, 0x222222)
            .setStrokeStyle(2, 0xff5555)
            .setOrigin(0.5)
            .setDepth(101);
            
        const message = this.add.text(centerX, height * 0.6, 
            `Pets aren't just virtual companions, they reflect our real-world responsibilities to animals.\n\n` +
            `In real life, pets deserve our love, care, and attention. They depend on us completely for their wellbeing.\n\n` +
            `Remember: Adopt, don't shop. And provide your pets with proper food, healthcare, exercise, and affection.`,
            {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: width * 0.75 }
            }
        ).setOrigin(0.5).setDepth(101);
        
        // Create countdown text
        const countdownText = this.add.text(centerX, height * 0.85, 'Returning to login page in 10 seconds', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '18px',
            color: '#ff8888',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(101);
        
        // Set a flag in localStorage to show this screen on next login
        this.markPetAsLeftForUser();
        
        // Add a return button for users
        const returnButtonX = width - 120;
        const returnButtonY = height - 40;
        const returnButton = this.add.rectangle(returnButtonX, returnButtonY, 100, 40, 0x555555)
            .setStrokeStyle(2, 0xaaaaaa)
            .setOrigin(0.5)
            .setDepth(101)
            .setInteractive({ useHandCursor: true });
            
        const returnText = this.add.text(returnButtonX, returnButtonY, 'RETURN', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '16px',
            color: '#aaaaaa'
        }).setOrigin(0.5).setDepth(101);
        
        // Add hover effect
        returnButton.on('pointerover', () => {
            returnButton.fillColor = 0x777777;
        });
        
        returnButton.on('pointerout', () => {
            returnButton.fillColor = 0x555555;
        });
        
        // Add click handler to reset the flag
        returnButton.on('pointerdown', () => {
            this.returnToLogin();
        });
        
        // Add version info to help with troubleshooting
        const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
        this.add.text(10, height - 10, `v${version}`, {
            fontSize: '12px',
            color: '#666666'
        }).setOrigin(0, 1).setDepth(101);
        
        // Start countdown to return to login
        let countdown = 10;
        const countdownTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                countdown--;
                countdownText.setText(`Returning to login page in ${countdown} seconds`);
                
                if (countdown <= 0) {
                    countdownTimer.remove();
                    this.returnToLogin();
                }
            },
            callbackScope: this,
            loop: true
        });
    }
    
    // Mark the pet as having left in localStorage and global context
    markPetAsLeftForUser() {
        try {
            // Get current user info
            const token = localStorage.getItem('token');
            const userId = this.getUserIdFromToken(token);
            
            // Use user-specific flag in localStorage
            if (userId) {
                localStorage.setItem(`petHasLeft_${userId}`, 'true');
                console.log(`Set petHasLeft flag for user ${userId}`);
            }
            
            // Update global context
            const globalContext = getGlobalContext();
            if (globalContext && globalContext.userData) {
                // Remove the pet from the user data but keep the account
                if (globalContext.userData.selectedPet) {
                    console.log(`Marking ${globalContext.userData.selectedPet.name} as having left the user`);
                }
                
                // Set selected pet to null
                globalContext.userData.selectedPet = null;
                globalContext.userData.hasSelectedPet = false;
                
                // Set a flag in user data too
                globalContext.userData.petHasLeft = true;
            }
        } catch (err) {
            console.error('Error marking pet as left:', err);
        }
    }
    
    // Return to login page
    returnToLogin() {
        // Keep the petHasLeft flag for this specific user
        const token = localStorage.getItem('token');
        const userId = this.getUserIdFromToken(token);
        const petHasLeftFlag = userId ? localStorage.getItem(`petHasLeft_${userId}`) : null;
        
        // Clear token and other data
        localStorage.clear();
        
        // Restore the user-specific flag
        if (userId && petHasLeftFlag) {
            localStorage.setItem(`petHasLeft_${userId}`, petHasLeftFlag);
        }
        
        // Redirect to login page
        window.location.href = '/';
    }

    // Helper method to extract user ID from token for flag storage
    getUserIdFromToken(token) {
        if (!token) return null;
        
        try {
            // JWT tokens have three parts separated by dots
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            // The middle part contains the payload
            const payload = JSON.parse(atob(parts[1]));
            return payload.id || payload._id || payload.userId || null;
        } catch (err) {
            console.error('Error extracting user ID from token:', err);
            return null;
        }
    }

    // Function to clear all game elements except those needed for the final screen
    clearGameScreen() {
        // Destroy pet sprite and UI elements
        if (this.pet) {
            this.pet.destroy();
            this.pet = null;
        }
        
        if (this.ui) {
            Object.values(this.ui).forEach(element => {
                if (element && element.destroy) {
                    element.destroy();
                }
            });
        }
        
        if (this.leftStatsPanel) {
            this.leftStatsPanel.destroy();
        }
        
        if (this.rightAttributesPanel) {
            this.rightAttributesPanel.destroy();
        }
        
        if (this.interactionButtons) {
            this.interactionButtons.forEach(button => button.destroy());
        }
        
        if (this.interactionButtonLabels) {
            this.interactionButtonLabels.forEach(label => label.destroy());
        }
        
        if (this.expBarBg) {
            this.expBarBg.destroy();
        }
        
        if (this.expBarFill) {
            this.expBarFill.destroy();
        }
        
        if (this.expBarText) {
            this.expBarText.destroy();
        }
    }

    // Static method to be called from other scenes to check happiness and return to main menu if needed
    static checkHappinessAndReturnToMenu(scene) {
        if (!scene || !scene.scene) {
            console.error('Invalid scene passed to checkHappinessAndReturnToMenu');
            return;
        }
        
        // Get pet data from the scene or global context
        const globalContext = getGlobalContext();
        const petData = scene.petData || globalContext?.userData?.selectedPet;
        
        if (!petData || !petData.attributes || petData.attributes.happiness === undefined) {
            console.warn('No pet data available to check happiness');
            return;
        }
        
        // Check if happiness is at 0
        const happiness = petData.attributes.happiness;
        if (happiness === 0) {
            console.log(`Pet happiness is 0, returning to main menu for leaving sequence`);
            
            // Set flag to force refresh pet data on main menu
            if (globalContext) {
                globalContext.userData.shouldRefreshPet = true;
                
                // Set a special flag to indicate the pet is leaving
                globalContext.userData.petIsLeaving = true;
            }
            
            // Transition back to main menu
            scene.cameras.main.fadeOut(500, 0, 0, 0);
            scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                scene.scene.start('MainMenu');
            });
            
            return true;
        }
        
        // Check if happiness is at or below the warning threshold (but not 0)
        if (happiness <= 50) {
            console.log(`Pet happiness is ${happiness}, returning to main menu for warning`);
            
            // Set flag to force refresh pet data on main menu
            if (globalContext) {
                globalContext.userData.shouldRefreshPet = true;
            }
            
            // Transition back to main menu
            scene.cameras.main.fadeOut(500, 0, 0, 0);
            scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                scene.scene.start('MainMenu');
            });
            
            return true;
        }
        
        return false;
    }

    // In case the user is seeing this erroneously, add a function to reset
    resetPetLeftFlag() {
        try {
            // Get current user info
            const token = localStorage.getItem('token');
            const userId = this.getUserIdFromToken(token);
            
            // Remove user-specific flag in localStorage
            if (userId) {
                localStorage.removeItem(`petHasLeft_${userId}`);
                console.log(`Removed petHasLeft flag for user ${userId}`);
            }
            
            // Update global context if available
            const globalContext = getGlobalContext();
            if (globalContext && globalContext.userData) {
                globalContext.userData.petHasLeft = false;
            }
            
            // Force reload the page
            window.location.reload();
        } catch (err) {
            console.error('Error resetting pet left flag:', err);
        }
    }
}
