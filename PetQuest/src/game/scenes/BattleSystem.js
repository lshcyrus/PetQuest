import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

// BattleSystem logic class as per design doc
class BattleSystemLogic {
    constructor(playerPet, enemy, battleground) {
        this.playerPet = playerPet;
        this.enemy = enemy;
        this.battleground = battleground;
        this.currentTurn = null; // 'player' or 'enemy'
        this.turnCount = 0;
        this.battleLog = [];
        this.isPlayerDefending = false;
        this.isEnemyDefending = false;
        this.itemUsedThisTurn = false;
        this.battleEnded = false;
        this.drops = [];
    }

    startBattle() {
        this.battleLog.push('Battle started!');
        this.battleLog.push(`${this.playerPet.name} vs ${this.enemy.name}`);
        this.battleLog.push(`Battleground: ${this.battleground}`);
        // Coin toss for first turn
        this.currentTurn = Math.random() < 0.5 ? 'player' : 'enemy';
        this.battleLog.push(`${this.currentTurn === 'player' ? this.playerPet.name : this.enemy.name} goes first!`);
        return this.battleLog;
    }

    nextTurn() {
        if (this.checkBattleEnd()) return false;
        if (this.currentTurn === 'player') {
            this.currentTurn = 'enemy';
            this.isPlayerDefending = false;
            this.itemUsedThisTurn = false;
        } else {
            this.currentTurn = 'player';
            this.isEnemyDefending = false;
            this.turnCount++;
        }
        this.battleLog.push(`Turn ${this.turnCount + 1}: ${this.currentTurn === 'player' ? this.playerPet.name : this.enemy.name}'s turn`);
        return true;
    }

    checkBattleEnd() {
        if (this.playerPet.hp <= 0) {
            this.battleLog.push(`${this.playerPet.name} has been defeated. You lost the battle.`);
            this.battleEnded = true;
            return true;
        } else if (this.enemy.hp <= 0) {
            this.battleLog.push(`${this.enemy.name} has been defeated. You won the battle!`);
            this.drops = this.generateEnemyDrops();
            this.battleLog.push(`${this.enemy.name} dropped: ${this.drops.join(', ')}`);
            this.battleEnded = true;
            return true;
        }
        return false;
    }

    attack(attacker, defender, isDefending) {
        const baseDamage = attacker.attack;
        const damageVariation = Math.random() * 0.2 + 0.9;
        let finalDamage = Math.floor(baseDamage * damageVariation);
        if (isDefending) {
            finalDamage = Math.floor(finalDamage * 0.5);
            this.battleLog.push(`${defender.name} is defending and takes reduced damage!`);
        }
        defender.hp -= finalDamage;
        if (defender.hp < 0) defender.hp = 0;
        this.battleLog.push(`${attacker.name} attacks ${defender.name} for ${finalDamage} damage!`);
        this.battleLog.push(`${defender.name} has ${defender.hp} HP remaining.`);
        return finalDamage;
    }

    useAbility(attacker, defender, abilityIndex, isDefending) {
        if (!attacker.abilities || abilityIndex >= attacker.abilities.length) {
            this.battleLog.push("That ability doesn't exist!");
            return false;
        }
        const ability = attacker.abilities[abilityIndex];
        if (ability.currentCooldown > 0) {
            this.battleLog.push(`${ability.name} is on cooldown for ${ability.currentCooldown} more turns!`);
            return false;
        }
        let damage = ability.damage;
        if (damage > 0 && isDefending) {
            damage = Math.floor(damage * 0.5);
            this.battleLog.push(`${defender.name} is defending and takes reduced damage!`);
        }
        switch (ability.type) {
            case 'damage':
                defender.hp -= damage;
                if (defender.hp < 0) defender.hp = 0;
                this.battleLog.push(`${attacker.name} uses ${ability.name} on ${defender.name} for ${damage} damage!`);
                break;
            case 'heal':
                attacker.hp += ability.healing;
                if (attacker.hp > attacker.maxhp) attacker.hp = attacker.maxhp;
                this.battleLog.push(`${attacker.name} uses ${ability.name} and heals for ${ability.healing} HP!`);
                break;
            case 'buff':
                attacker.attack += ability.attackBuff || 0;
                attacker.defense += ability.defenseBuff || 0;
                this.battleLog.push(`${attacker.name} uses ${ability.name} and gains ${ability.attackBuff || 0} attack and ${ability.defenseBuff || 0} defense!`);
                break;
            case 'debuff':
                defender.attack -= ability.attackDebuff || 0;
                defender.defense -= ability.defenseDebuff || 0;
                if (defender.attack < 0) defender.attack = 0;
                if (defender.defense < 0) defender.defense = 0;
                this.battleLog.push(`${attacker.name} uses ${ability.name} on ${defender.name}, reducing attack by ${ability.attackDebuff || 0} and defense by ${ability.defenseDebuff || 0}!`);
                break;
        }
        ability.currentCooldown = ability.cooldown;
        this.battleLog.push(`${defender.name} has ${defender.hp} HP remaining.`);
        return true;
    }

    defend(character) {
        if (this.currentTurn === 'player') {
            this.isPlayerDefending = true;
            this.battleLog.push(`${this.playerPet.name} takes a defensive stance!`);
        } else {
            this.isEnemyDefending = true;
            this.battleLog.push(`${this.enemy.name} takes a defensive stance!`);
        }
        return true;
    }

    useItem(item) {
        if (this.itemUsedThisTurn) {
            this.battleLog.push("You've already used item this turn!");
            return false;
        }
        switch (item.type) {
            case 'heal':
                this.playerPet.hp += item.value;
                if (this.playerPet.hp > this.playerPet.maxhp) this.playerPet.hp = this.playerPet.maxhp;
                this.battleLog.push(`You used ${item.name} to ${this.playerPet.name} and restored ${item.value} HP!`);
                break;
            case 'attackBuff':
                this.playerPet.attack += item.value;
                this.battleLog.push(`You used ${item.name} to ${this.playerPet.name} and increased attack by ${item.value}!`);
                break;
            case 'defenseBuff':
                this.playerPet.defense += item.value;
                this.battleLog.push(`You used ${item.name} to ${this.playerPet.name} and increased defense by ${item.value}!`);
                break;
        }
        this.itemUsedThisTurn = true;
        return true;
    }

    enemyTurn() {
        // Simple AI logic
        const actions = ['attack', 'ability', 'defend'];
        let chosenAction;
        if (this.enemy.hp < this.enemy.maxhp * 0.3) {
            const healingAbilities = (this.enemy.abilities || []).filter(a => a.type === 'heal' && a.currentCooldown === 0);
            if (healingAbilities.length > 0) {
                const randomHealAbility = Math.floor(Math.random() * healingAbilities.length);
                const abilityIndex = this.enemy.abilities.indexOf(healingAbilities[randomHealAbility]);
                this.useAbility(this.enemy, this.playerPet, abilityIndex, this.isPlayerDefending);
                return;
            } else if (Math.random() < 0.7) {
                this.defend(this.enemy);
                return;
            }
        }
        chosenAction = actions[Math.floor(Math.random() * actions.length)];
        switch (chosenAction) {
            case 'attack':
                this.attack(this.enemy, this.playerPet, this.isPlayerDefending);
                break;
            case 'ability':
                const availableAbilities = (this.enemy.abilities || []).filter(a => a.currentCooldown === 0);
                if (availableAbilities.length > 0) {
                    const randomAbility = Math.floor(Math.random() * availableAbilities.length);
                    const abilityIndex = this.enemy.abilities.indexOf(availableAbilities[randomAbility]);
                    this.useAbility(this.enemy, this.playerPet, abilityIndex, this.isPlayerDefending);
                } else {
                    this.attack(this.enemy, this.playerPet, this.isPlayerDefending);
                }
                break;
            case 'defend':
                this.defend(this.enemy);
                break;
        }
    }

    generateEnemyDrops() {
        // Simple drop logic for now
        const genericDrops = ['Health Potion', 'Attack Boost', 'Defense Boost', 'Gold Coin'];
        const dropCount = Math.floor(Math.random() * 3) + 1;
        const drops = [];
        for (let i = 0; i < dropCount; i++) {
            drops.push(genericDrops[Math.floor(Math.random() * genericDrops.length)]);
        }
        return drops;
    }
}

export class BattleSystem extends Scene {
    constructor() {
        super('BattleSystem');
    }

    init(data) {
        this.pet = { ...data.pet };
        this.enemy = { ...data.enemy };
        this.levelData = data.levelData;
        this.battleground = this.levelData ? this.levelData.background : 'Unknown';
        this.logic = new BattleSystemLogic(this.pet, this.enemy, this.battleground);
        this.selectedAbility = 0;
        this.selectedItem = null;
    }

    preload() {
        // Load background and placeholder sprites
        this.load.image('battle_bg', '../public/assets/battle_bg.png');
        // TODO: Load real pet/enemy sprites and pixel-style button images
    }

    create() {
        const { width, height } = this.scale;
        // --- Background ---
        this.add.image(width / 2, height / 2, 'battle_bg').setDepth(0);

        // --- Sprites (placeholders) ---
        this.petSprite = this.add.rectangle(width * 0.22, height * 0.5, 120, 120, 0x44ccff).setDepth(1);
        this.enemySprite = this.add.rectangle(width * 0.78, height * 0.5, 120, 120, 0xff4444).setDepth(1);
        this.petNameText = this.add.text(width * 0.22, height * 0.62, this.pet.name, { fontSize: '20px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
        this.enemyNameText = this.add.text(width * 0.78, height * 0.62, this.enemy.name, { fontSize: '20px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);

        // --- Status Bars ---
        this.createStatusBars();

        // --- Battle Log ---
        this.createBattleLog();

        // --- Turn Menu ---
        this.createTurnMenu();

        // --- Result Popup (hidden by default) ---
        this.resultPopup = this.add.container(width / 2, height / 2).setDepth(10).setVisible(false);
        this.resultBg = this.add.rectangle(0, 0, width * 0.6, height * 0.4, 0x222222, 0.95).setOrigin(0.5);
        this.resultText = this.add.text(0, -30, '', { fontSize: '32px', color: '#fff', fontFamily: 'monospace', align: 'center' }).setOrigin(0.5);
        this.rewardText = this.add.text(0, 30, '', { fontSize: '20px', color: '#ffff99', fontFamily: 'monospace', align: 'center' }).setOrigin(0.5);
        this.resultPopup.add([this.resultBg, this.resultText, this.rewardText]);

        EventBus.emit('current-scene-ready', this);
        this.startBattle();
    }

    createStatusBars() {
        const { width, height } = this.scale;
        // Pet HP Bar
        this.petHpBarBg = this.add.rectangle(width * 0.12, height * 0.32, 120, 18, 0x333333).setOrigin(0, 0.5);
        this.petHpBar = this.add.rectangle(width * 0.12, height * 0.32, 120, 18, 0x00ff00).setOrigin(0, 0.5);
        this.petHpText = this.add.text(width * 0.12 + 60, height * 0.32, '', { fontSize: '14px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
        // Enemy HP Bar
        this.enemyHpBarBg = this.add.rectangle(width * 0.68, height * 0.32, 120, 18, 0x333333).setOrigin(0, 0.5);
        this.enemyHpBar = this.add.rectangle(width * 0.68, height * 0.32, 120, 18, 0xff0000).setOrigin(0, 0.5);
        this.enemyHpText = this.add.text(width * 0.68 + 60, height * 0.32, '', { fontSize: '14px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
        // (Optional) Energy bars can be added similarly
        this.updateStatusBars();
    }

    updateStatusBars() {
        // Pet
        const petHpRatio = Math.max(0, this.pet.hp / (this.pet.maxhp || this.pet.hp));
        this.petHpBar.width = 120 * petHpRatio;
        this.petHpText.setText(`HP: ${this.pet.hp}/${this.pet.maxhp || this.pet.hp}`);
        // Enemy
        const enemyHpRatio = Math.max(0, this.enemy.hp / (this.enemy.maxhp || this.enemy.hp));
        this.enemyHpBar.width = 120 * enemyHpRatio;
        this.enemyHpText.setText(`HP: ${this.enemy.hp}/${this.enemy.maxhp || this.enemy.hp}`);
    }

    createBattleLog() {
        const { width, height } = this.scale;
        this.battleLogBg = this.add.rectangle(width / 2, height * 0.18, width * 0.7, 60, 0x111111, 0.7).setOrigin(0.5);
        this.battleLogText = this.add.text(width / 2, height * 0.18, '', {
            fontSize: '16px',
            color: '#ffff99',
            fontFamily: 'monospace',
            align: 'center',
            wordWrap: { width: width * 0.65 }
        }).setOrigin(0.5);
    }

    updateBattleLog() {
        const log = this.logic.battleLog.slice(-4).join('\n');
        this.battleLogText.setText(log);
    }

    createTurnMenu() {
        const { width, height } = this.scale;
        this.turnMenuButtons = [];
        const actions = [
            { label: 'Attack', action: () => this.handlePlayerAction('attack'), x: width * 0.25 },
            { label: 'Skill 1', action: () => this.handlePlayerAction('skill1'), x: width * 0.38 },
            { label: 'Skill 2', action: () => this.handlePlayerAction('skill2'), x: width * 0.51 },
            { label: 'Defend', action: () => this.handlePlayerAction('defend'), x: width * 0.64 },
            { label: 'Item', action: () => this.handlePlayerAction('item'), x: width * 0.77 },
            { label: 'Run', action: () => this.handlePlayerAction('run'), x: width * 0.90 },
        ];
        actions.forEach((btn, i) => {
            const button = this.add.rectangle(btn.x, height * 0.88, 90, 38, 0x222244, 1).setOrigin(0.5).setInteractive({ useHandCursor: true });
            const label = this.add.text(btn.x, height * 0.88, btn.label, {
                fontSize: '18px', color: '#fff', fontFamily: 'monospace', align: 'center'
            }).setOrigin(0.5);
            button.on('pointerover', () => button.setFillStyle(0x4444aa));
            button.on('pointerout', () => button.setFillStyle(0x222244));
            button.on('pointerdown', btn.action);
            this.turnMenuButtons.push({ button, label });
        });
    }

    setTurnMenuEnabled(enabled) {
        this.turnMenuButtons.forEach(btn => btn.button.setInteractive(enabled));
    }

    startBattle() {
        this.logic.startBattle();
        this.updateBattleLog();
        this.updateStatusBars();
        if (this.logic.currentTurn === 'player') {
            this.startPlayerTurn();
        } else {
            this.setTurnMenuEnabled(false);
            this.time.delayedCall(1000, () => this.enemyTurn());
        }
    }

    startPlayerTurn() {
        if (this.logic.battleEnded) return;
        this.setTurnMenuEnabled(true);
        this.logic.battleLog.push('Your turn! Choose an action.');
        this.updateBattleLog();
    }

    handlePlayerAction(action) {
        if (this.logic.battleEnded || this.logic.currentTurn !== 'player') return;
        this.setTurnMenuEnabled(false);
        switch (action) {
            case 'attack':
                this.animateAttack('pet', () => {
                    this.logic.attack(this.pet, this.enemy, this.logic.isEnemyDefending);
                    this.afterPlayerAction();
                });
                break;
            case 'skill1':
                this.animateAttack('pet', () => {
                    this.logic.useAbility(this.pet, this.enemy, 0, this.logic.isEnemyDefending);
                    this.afterPlayerAction();
                });
                break;
            case 'skill2':
                this.animateAttack('pet', () => {
                    this.logic.useAbility(this.pet, this.enemy, 1, this.logic.isEnemyDefending);
                    this.afterPlayerAction();
                });
                break;
            case 'defend':
                this.logic.defend(this.pet);
                this.afterPlayerAction();
                break;
            case 'item':
                // Example item
                const item = { type: 'heal', name: 'Health Potion', value: 20 };
                this.logic.useItem(item);
                this.afterPlayerAction();
                break;
            case 'run':
                this.logic.battleLog.push('You ran away!');
                this.logic.battleEnded = true;
                this.updateBattleLog();
                this.showResultPopup('Run', []);
                this.time.delayedCall(2000, () => {
                    this.scene.start('LevelSelector', { pet: this.pet });
                });
                return;
        }
    }

    afterPlayerAction() {
        this.updateStatusBars();
        this.updateBattleLog();
        if (this.logic.checkBattleEnd()) {
            this.updateBattleLog();
            if (this.pet.hp <= 0) {
                this.showResultPopup('Defeat', []);
            } else if (this.enemy.hp <= 0) {
                this.showResultPopup('Victory', this.logic.drops);
            }
            this.time.delayedCall(2500, () => {
                this.scene.start('LevelSelector', { pet: this.pet });
            });
        } else {
            this.time.delayedCall(1000, () => this.enemyTurn());
        }
    }

    enemyTurn() {
        if (this.logic.battleEnded) return;
        this.animateAttack('enemy', () => {
            this.logic.enemyTurn();
            this.updateStatusBars();
            this.updateBattleLog();
            if (this.logic.checkBattleEnd()) {
                this.updateBattleLog();
                if (this.pet.hp <= 0) {
                    this.showResultPopup('Defeat', []);
                } else if (this.enemy.hp <= 0) {
                    this.showResultPopup('Victory', this.logic.drops);
                }
                this.time.delayedCall(2500, () => {
                    this.scene.start('LevelSelector', { pet: this.pet });
                });
            } else {
                this.logic.nextTurn();
                this.time.delayedCall(1000, () => this.startPlayerTurn());
            }
        });
    }

    animateAttack(who, onComplete) {
        // Simple flash animation for attack
        const sprite = who === 'pet' ? this.enemySprite : this.petSprite;
        this.tweens.add({
            targets: sprite,
            alpha: 0.3,
            yoyo: true,
            duration: 120,
            repeat: 2,
            onComplete
        });
    }

    showResultPopup(result, rewards) {
        this.resultPopup.setVisible(true);
        this.resultText.setText(result === 'Victory' ? 'Victory!' : result === 'Defeat' ? 'Defeat!' : 'You ran away!');
        if (result === 'Victory' && rewards && rewards.length > 0) {
            this.rewardText.setText('Rewards: ' + rewards.join(', '));
        } else {
            this.rewardText.setText('');
        }
    }
} 