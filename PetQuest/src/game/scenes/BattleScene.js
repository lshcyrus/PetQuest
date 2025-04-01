import { Scene } from 'phaser';
import { getGlobalContext } from '../../utils/contextBridge';
import { Pet } from '../entities/Pet';
import { createTouchButton } from '../../utils/touchUtils';

export class BattleScene extends Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    // Battle state
    this.isPlayerTurn = true;
    this.battleEnded = false;
    this.turnCount = 0;
  }
  
  create() {
    // Get game dimensions
    const { width, height } = this.scale;
    
    // Add background
    this.add.image(width / 2, height / 2, 'battle_background')
      .setDisplaySize(width, height);
    
    // Get pet data from global context
    const globalContext = getGlobalContext();
    const petData = globalContext.userData.selectedPet;
    
    // Create pet
    this.pet = new Pet(this, petData, 200, 300);
    
    // Display pet with animations
    this.pet.create(0.6, 2);
    this.pet.createNameDisplay();
    
    // Create enemy
    this.enemy = new Pet(this, {
      name: "Evil Dragon",
      key: "enemy_dragon",
      stats: { health: 100, attack: 60, defense: 40, speed: 30 }
    }, 600, 300);
    
    this.enemy.create(0.6, 1);
    this.enemy.createNameDisplay();
    
    // Add health bars
    this.createHealthBars();
    
    // Battle buttons
    this.createBattleControls();
    
    // Status text
    this.statusText = this.add.text(width / 2, 100, 'Battle Start!', {
      fontFamily: '"Silkscreen", cursive',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    
    // Determine who goes first based on speed
    this.determineFirstTurn();
  }
  
  createHealthBars() {
    // Pet health bar
    this.createHealthBar(this.pet, 200, 220);
    
    // Enemy health bar
    this.createHealthBar(this.enemy, 600, 220);
  }
  
  createHealthBar(pet, x, y) {
    const width = 150;
    const height = 20;
    
    // Get max health for reference
    const maxHealth = pet.data.stats.health;
    
    // Create background
    const barBg = this.add.rectangle(x, y, width, height, 0x333333)
      .setOrigin(0.5);
    
    // Create fill
    const barFill = this.add.rectangle(
      x - width / 2, 
      y, 
      width, 
      height, 
      0xff5555
    ).setOrigin(0, 0.5);
    
    // Health text
    const healthText = this.add.text(
      x, 
      y + height + 5, 
      `${pet.data.stats.health}/${maxHealth}`, 
      {
        fontFamily: '"Silkscreen", cursive',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);
    
    // Store references
    pet.healthBar = {
      background: barBg,
      fill: barFill,
      text: healthText,
      maxWidth: width,
      maxHealth: maxHealth
    };
  }
  
  updateHealthBar(pet) {
    const healthPercent = Math.max(0, pet.data.stats.health) / pet.healthBar.maxHealth;
    const newWidth = pet.healthBar.maxWidth * healthPercent;
    
    // Animate health bar reduction
    this.tweens.add({
      targets: pet.healthBar.fill,
      width: newWidth,
      duration: 300,
      ease: 'Power1'
    });
    
    // Update text
    pet.healthBar.text.setText(
      `${Math.max(0, pet.data.stats.health)}/${pet.healthBar.maxHealth}`
    );
  }
  
  createBattleControls() {
    const { width, height } = this.scale;
    
    // Container for buttons
    this.controlsContainer = this.add.container(width / 2, height - 100);
    
    // Attack button
    const attackButton = createTouchButton(
      this, 
      -100, 
      0, 
      'Attack', 
      { fontSize: '24px' }, 
      () => this.attack()
    );
    
    // Defend button
    const defendButton = createTouchButton(
      this, 
      100, 
      0, 
      'Defend', 
      { fontSize: '24px' }, 
      () => this.defend()
    );
    
    // Add to container
    this.controlsContainer.add([attackButton, defendButton]);
  }
  
  determineFirstTurn() {
    // Compare speed stats to determine who goes first
    const playerSpeed = this.pet.data.stats.speed;
    const enemySpeed = this.enemy.data.stats.speed;
    
    this.isPlayerTurn = playerSpeed >= enemySpeed;
    
    // If it's enemy's turn, start their attack after a delay
    if (!this.isPlayerTurn) {
      this.statusText.setText("Enemy's turn!");
      this.time.delayedCall(1500, () => this.enemyAttack());
    } else {
      this.statusText.setText("Your turn!");
    }
  }
  
  attack() {
    if (!this.isPlayerTurn || this.battleEnded) return;
    
    // Disable controls during animation
    this.controlsContainer.setAlpha(0.5);
    this.controlsContainer.removeInteractive();
    
    // Move pet toward enemy for attack animation
    this.tweens.add({
      targets: this.pet.sprite,
      x: 400,
      duration: 300,
      yoyo: true,
      onComplete: () => {
        // Deal damage based on pet stats
        const damage = this.calculateDamage(
          this.pet.data.stats.attack,
          this.enemy.data.stats.defense
        );
        
        this.dealDamage(this.enemy, damage);
        
        // Check if enemy is defeated
        if (this.enemy.data.stats.health <= 0) {
          this.endBattle(true);
        } else {
          // Switch turns
          this.switchTurn();
        }
      }
    });
  }
  
  defend() {
    if (!this.isPlayerTurn || this.battleEnded) return;
    
    // Increase defense temporarily
    const originalDefense = this.pet.data.stats.defense;
    this.pet.data.stats.defense = Math.floor(originalDefense * 1.5);
    
    // Visual indicator
    this.pet.sprite.setTint(0x3399ff);
    
    // Update status
    this.statusText.setText("Defending!");
    
    // Apply defense boost for one turn
    this.pet.isDefending = true;
    
    // Switch turns
    this.switchTurn();
  }
  
  enemyAttack() {
    if (this.isPlayerTurn || this.battleEnded) return;
    
    // Move enemy toward pet for attack animation
    this.tweens.add({
      targets: this.enemy.sprite,
      x: 400,
      duration: 300,
      yoyo: true,
      onComplete: () => {
        // Deal damage based on enemy stats
        const damage = this.calculateDamage(
          this.enemy.data.stats.attack,
          this.pet.data.stats.defense
        );
        
        this.dealDamage(this.pet, damage);
        
        // Check if player is defeated
        if (this.pet.data.stats.health <= 0) {
          this.endBattle(false);
        } else {
          // Switch turns
          this.switchTurn();
        }
      }
    });
  }
  
  switchTurn() {
    this.isPlayerTurn = !this.isPlayerTurn;
    this.turnCount++;
    
    // If player was defending, reset defense after their turn
    if (!this.isPlayerTurn && this.pet.isDefending) {
      this.pet.isDefending = false;
      this.pet.sprite.clearTint();
    }
    
    if (this.isPlayerTurn) {
      // Enable controls for player's turn
      this.statusText.setText("Your turn!");
      this.controlsContainer.setAlpha(1);
      this.controlsContainer.setInteractive();
    } else {
      // Enemy turn
      this.statusText.setText("Enemy's turn!");
      this.controlsContainer.setAlpha(0.5);
      
      // Give a slight delay before enemy attacks
      this.time.delayedCall(1500, () => this.enemyAttack());
    }
  }
  
  calculateDamage(attackStat, defenseStat) {
    // Base damage calculation
    let damage = Math.max(5, attackStat - (defenseStat * 0.5));
    
    // Add some randomness (±20%)
    const randomFactor = 0.8 + (Math.random() * 0.4);
    damage = Math.floor(damage * randomFactor);
    
    return damage;
  }
  
  dealDamage(target, amount) {
    // Reduce health
    target.data.stats.health -= amount;
    
    // Update health bar
    this.updateHealthBar(target);
    
    // Show damage text
    this.showDamageText(target, amount);
  }
  
  showDamageText(target, amount) {
    // Create damage text that floats up
    const damageText = this.add.text(
      target.x, 
      target.y - 50, 
      `-${amount}`, 
      {
        fontFamily: '"Silkscreen", cursive',
        fontSize: '24px',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    
    // Animate it
    this.tweens.add({
      targets: damageText,
      y: damageText.y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => damageText.destroy()
    });
  }
  
  endBattle(playerWon) {
    this.battleEnded = true;
    
    // Disable controls
    this.controlsContainer.setAlpha(0.5);
    this.controlsContainer.removeInteractive();
    
    // Show result
    this.statusText.setText(playerWon ? "Victory!" : "Defeat!");
    
    // Add return button
    const { width, height } = this.scale;
    createTouchButton(
      this,
      width / 2,
      height - 50,
      'Return to Menu',
      { fontSize: '20px' },
      () => this.scene.start('MainMenu')
    );
    
    // If player won, give rewards
    if (playerWon) {
      // Show reward text
      this.add.text(
        width / 2,
        height / 2,
        'You earned 100 XP!',
        {
          fontFamily: '"Silkscreen", cursive',
          fontSize: '28px',
          color: '#ffff00',
          stroke: '#000000',
          strokeThickness: 4
        }
      ).setOrigin(0.5);
      
      // Save progress to global context
      const globalContext = getGlobalContext();
      if (globalContext.userData) {
        // Add XP or other rewards here
        // Example: globalContext.userData.xp = (globalContext.userData.xp || 0) + 100;
      }
    }
  }
  
  update() {
    // This method runs every frame
    // Can be used for continuous updates if needed
  }
}
