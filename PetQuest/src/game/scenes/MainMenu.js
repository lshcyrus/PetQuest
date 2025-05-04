import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import Phaser from 'phaser';
import { getGlobalContext } from '../../utils/contextBridge';
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
            
            // Log which pet is being loaded
            if (this.petData) {
                console.log(`Loading pet in MainMenu: ${this.petData.name}`);
            } else {
                console.warn('No pet data found in MainMenu');
            }
        } else {
            // Fallback if context is not available
            this.username = data.username || 'Player';
        }
    }

    create() {
        this.setupBackground();
        this.setupUI();
        this.setupPet();
        
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
    }

    // Create left panel for stats and level
    createLeftStatsPanel() {
        if (this.leftStatsPanel) this.leftStatsPanel.destroy();
        const { width, height } = this.scale;
        const panelWidth = Math.min(260, width * 0.28);
        const panelX = panelWidth * 0.5 + 10;
        const panelY = height * 0.5;
        this.leftStatsPanel = this.add.container(panelX, panelY);
        // Panel background
        const bg = this.add.rectangle(0, 0, panelWidth, 220, 0x222233, 0.7)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xffffff);
        this.leftStatsPanel.add(bg);
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
            { key: 'hp', label: 'HP', max: 5000 },
            { key: 'sp', label: 'SP', max: 1000 },
            { key: 'atk', label: 'ATK', max: 400 },
            { key: 'def', label: 'DEF', max: 400 }
        ];
        const stats = this.petData.stats || {};
        statConfig.forEach((stat, i) => {
            const yOffset = -30 + i * 36;
            const value = stats[stat.key] !== undefined ? stats[stat.key] : '-';
            const statText = this.add.text(-panelWidth/2 + 16, yOffset, `${stat.label}: ${value}`, {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5);
            this.leftStatsPanel.add(statText);
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
        // Panel background
        const bg = this.add.rectangle(0, 0, panelWidth, 220, 0x233322, 0.7)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xffffff);
        this.rightAttributesPanel.add(bg);
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
            { key: 'hunger', label: 'Hunger', color: 0x66b3ff },
            { key: 'cleanliness', label: 'Cleanliness', color: 0x99ff99 },
            { key: 'stamina', label: 'Stamina', color: 0xff99cc }
        ];
        let shown = false;
        // Calculate panel height based on number of shown attributes (always show space for all 4)
        const attrRowHeight = 48;
        const attrCount = attrConfig.filter(attr => attributes[attr.key] !== undefined).length || 4;
        const topPadding = 56; // More space below the title
        const panelHeight = topPadding + attrRowHeight * attrCount;
        bg.height = panelHeight;
        attrConfig.forEach((attr, i) => {
            if (attributes[attr.key] !== undefined) {
                shown = true;
                // Add extra top padding for the first row
                const yOffset = -panelHeight/2 + topPadding + i * attrRowHeight;
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
                const value = Math.max(0, Math.min(100, attributes[attr.key]));
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
            this.pet.setPosition(width / 2, height * 0.8);
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
        
        // Try to create the DOM input element
        try {
            // Create a semi-transparent background
            const overlay = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.7)
                .setOrigin(0)
                .setDepth(10)
                .setInteractive(); // Block interactions below
                
            // Create dialog box
            const dialogWidth = Math.min(width * 0.8, 400);
            const dialogHeight = 200;
            const dialogX = width / 2;
            const dialogY = height / 2;
            
            const dialog = this.add.rectangle(dialogX, dialogY, dialogWidth, dialogHeight, 0x333333)
                .setStrokeStyle(2, 0xffffff)
                .setDepth(11);
                
            // Add title
            const title = this.add.text(dialogX, dialogY - 70, 'Rename Your Pet', {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5)
              .setDepth(11);
              
            // Add input field
            const input = this.add.dom(dialogX, dialogY, 'input')
                .setOrigin(0.5)
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
            inputElement.maxLength = 20;
            inputElement.value = this.pet.data.name;
            inputElement.focus();
            
            // Add buttons
            const buttonY = dialogY + 50;
            
            // Cancel button
            const cancelButton = this.add.rectangle(dialogX - 70, buttonY, 120, 40, 0x880000)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true })
                .setDepth(11);
                
            const cancelText = this.add.text(dialogX - 70, buttonY, 'CANCEL', {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5)
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
            const confirmButton = this.add.rectangle(dialogX + 70, buttonY, 120, 40, 0x008800)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true })
                .setDepth(11);
                
            const confirmText = this.add.text(dialogX + 70, buttonY, 'SAVE', {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5)
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
}
