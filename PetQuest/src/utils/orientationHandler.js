/**
 * Handle screen orientation changes
 */

export const initOrientationHandling = () => {
    // Force screen resize on orientation change
    window.addEventListener('orientationchange', () => {
        // Give the browser a moment to settle into new orientation
        setTimeout(() => {
            // Trigger window resize event
            window.dispatchEvent(new Event('resize'));
            
            // Get current orientation
            const isPortrait = window.innerHeight > window.innerWidth;
            document.body.classList.toggle('portrait', isPortrait);
            document.body.classList.toggle('landscape', !isPortrait);
            
            // Update game scaling if needed (through the resize event)
            if (window.game && window.game.scale) {
                window.game.scale.refresh();
            }
        }, 100);
    });
    
    // Set initial orientation class
    const isPortrait = window.innerHeight > window.innerWidth;
    document.body.classList.toggle('portrait', isPortrait);
    document.body.classList.toggle('landscape', !isPortrait);
};

// Call in your main.js or App.jsx entry point