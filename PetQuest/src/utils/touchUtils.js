/**
 * Touch-friendly UI utilities for Phaser game
 */

/**
 * Detect if current device is mobile
 * @returns {boolean} True if mobile device
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Setup touch-friendly controls for the scene
 * @param {Phaser.Scene} scene - Current Phaser scene
 * @param {Object} options - Configuration options
 * @param {Function} options.onTap - Callback for tap actions
 * @param {Function} options.onSwipe - Callback for swipe actions
 * @param {Function} options.onDrag - Callback for drag actions
 */
export const setupTouchControls = (scene, options = {}) => {
  const { width, height } = scene.scale;
  const { onTap, onSwipe, onDrag } = options;
  
  // Create a transparent interactive area
  const touchArea = scene.add.rectangle(width/2, height/2, width, height)
    .setOrigin(0.5)
    .setInteractive()
    .setAlpha(0.001);
  
  // Track touch/pointer movement
  let startX, startY, isDown = false;
  const swipeThreshold = 50; // Minimum distance for a swipe
  
  // Handle pointer down
  touchArea.on('pointerdown', (pointer) => {
    startX = pointer.x;
    startY = pointer.y;
    isDown = true;
    
    if (onDrag) {
      scene.input.on('pointermove', handleDrag);
    }
  });
  
  // Handle drag
  const handleDrag = (pointer) => {
    if (!isDown) return;
    
    if (onDrag) {
      onDrag(pointer, { 
        deltaX: pointer.x - startX,
        deltaY: pointer.y - startY 
      });
    }
  };
  
  // Handle pointer up
  touchArea.on('pointerup', (pointer) => {
    isDown = false;
    scene.input.off('pointermove', handleDrag);
    
    // Calculate distance moved to determine if it's a tap or swipe
    const dx = pointer.x - startX;
    const dy = pointer.y - startY;
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    if (distance < swipeThreshold) {
      // It's a tap
      if (onTap) {
        onTap(pointer);
      }
    } else {
      // It's a swipe - determine direction
      if (onSwipe) {
        let direction = '';
        
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe
          direction = dx > 0 ? 'right' : 'left';
        } else {
          // Vertical swipe
          direction = dy > 0 ? 'down' : 'up';
        }
        
        onSwipe(direction, { deltaX: dx, deltaY: dy });
      }
    }
  });
  
  // Clean up function
  return () => {
    touchArea.removeAllListeners();
    scene.input.off('pointermove', handleDrag);
    touchArea.destroy();
  };
};

/**
 * Create a touch-friendly button
 * @param {Phaser.Scene} scene - Current Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} text - Button text
 * @param {Object} style - Text style
 * @param {Function} callback - Button click callback
 * @returns {Phaser.GameObjects.Container} Button container
 */
export const createTouchButton = (scene, x, y, text, style = {}, callback) => {
  const isMobile = isMobileDevice();
  
  // Default style with mobile-friendly properties
  const defaultStyle = {
    fontFamily: '"Silkscreen", cursive',
    fontSize: isMobile ? '24px' : '18px',
    color: '#ffffff',
    padding: {
      x: isMobile ? 20 : 12,
      y: isMobile ? 15 : 8
    },
    stroke: '#000000',
    strokeThickness: 4
  };
  
  // Merge with provided style
  const finalStyle = { ...defaultStyle, ...style };
  
  // Create text
  const buttonText = scene.add.text(0, 0, text, finalStyle).setOrigin(0.5);
  
  // Create background
  const padding = {
    x: isMobile ? 30 : 20,
    y: isMobile ? 20 : 12
  };
  
  const background = scene.add.rectangle(
    0, 0,
    buttonText.width + padding.x * 2,
    buttonText.height + padding.y * 2,
    0x000000, 0.5
  ).setOrigin(0.5);
  
  // Create container for button
  const container = scene.add.container(x, y, [background, buttonText])
    .setSize(background.width, background.height)
    .setInteractive({ useHandCursor: true });
  
  // Add touch/click animations
  container.on('pointerdown', () => {
    container.setScale(0.95);
    background.setFillStyle(0x333333, 0.7);
  });
  
  container.on('pointerup', () => {
    container.setScale(1);
    background.setFillStyle(0x000000, 0.5);
    if (callback) callback();
  });
  
  container.on('pointerout', () => {
    container.setScale(1);
    background.setFillStyle(0x000000, 0.5);
  });
  
  return container;
};

/**
 * Create a virtual joystick for mobile controls
 * @param {Phaser.Scene} scene - Current Phaser scene
 * @param {Object} options - Configuration options
 * @returns {Object} Joystick object with update method
 */
export const createVirtualJoystick = (scene, options = {}) => {
  const {
    x = 150,
    y = scene.scale.height - 150,
    radius = 60,
    onMove = () => {},
    fixed = true
  } = options;
  
  // Create joystick parts
  const base = scene.add.circle(x, y, radius, 0x000000, 0.5);
  const thumb = scene.add.circle(x, y, radius/2, 0xcccccc, 0.7);
  
  // Make base interactive
  base.setInteractive();
  
  let isActive = false;
  let baseX = x;
  let baseY = y;
  
  // Handle pointer down
  base.on('pointerdown', (pointer) => {
    isActive = true;
    if (!fixed) {
      baseX = pointer.x;
      baseY = pointer.y;
      base.setPosition(baseX, baseY);
    }
  });
  
  // Handle document-wide pointer up
  scene.input.on('pointerup', () => {
    isActive = false;
    thumb.setPosition(baseX, baseY);
  });
  
  // Handle pointer move
  scene.input.on('pointermove', (pointer) => {
    if (!isActive) return;
    
    // Calculate distance from base
    const dx = pointer.x - baseX;
    const dy = pointer.y - baseY;
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    // Normalize for direction
    const angle = Math.atan2(dy, dx);
    
    // Clamp to joystick radius
    const limitedDistance = Math.min(distance, radius);
    
    // Calculate new position
    const newX = baseX + Math.cos(angle) * limitedDistance;
    const newY = baseY + Math.sin(angle) * limitedDistance;
    
    // Update thumb position
    thumb.setPosition(newX, newY);
    
    // Calculate force (0-1) and direction
    const force = limitedDistance / radius;
    
    // Call onMove callback with normalized x/y values (-1 to 1)
    onMove({
      x: Math.cos(angle) * force,
      y: Math.sin(angle) * force,
      force
    });
  });
  
  return {
    base,
    thumb,
    update: (visible = true) => {
      base.setVisible(visible);
      thumb.setVisible(visible);
    },
    destroy: () => {
      base.removeAllListeners();
      base.destroy();
      thumb.destroy();
      scene.input.off('pointerup');
    }
  };
};

/**
 * Add touch gestures like pinch-to-zoom
 * @param {Phaser.Scene} scene - Current Phaser scene
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export const addTouchGestures = (scene, options = {}) => {
  const { onPinch, onRotate } = options;
  
  let pinchDistance = 0;
  let pinchAngle = 0;
  let isPinching = false;
  
  scene.input.on('pointermove', (pointer) => {
    // Only handle pinch if we have multiple active pointers
    if (scene.input.pointer1.isDown && scene.input.pointer2.isDown) {
      const p1 = scene.input.pointer1;
      const p2 = scene.input.pointer2;
      
      // Calculate new distance and angle
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const currentDistance = Math.sqrt(dx*dx + dy*dy);
      const currentAngle = Math.atan2(dy, dx);
      
      if (!isPinching) {
        // Starting a pinch gesture
        pinchDistance = currentDistance;
        pinchAngle = currentAngle;
        isPinching = true;
      } else {
        // Continue pinch
        if (onPinch) {
          const pinchScale = currentDistance / pinchDistance;
          onPinch(pinchScale);
          
          // Update baseline to make movement more natural
          pinchDistance = currentDistance;
        }
        
        if (onRotate) {
          let angleDiff = currentAngle - pinchAngle;
          
          // Normalize angle difference
          if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          
          onRotate(angleDiff);
          pinchAngle = currentAngle;
        }
      }
    } else {
      isPinching = false;
    }
  });
  
  // Return cleanup function
  return () => {
    scene.input.off('pointermove');
  };
};