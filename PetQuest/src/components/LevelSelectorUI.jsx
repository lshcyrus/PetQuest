import React, { useEffect, useState } from 'react';
import { EventBus } from './../game/EventBus';

const LevelSelectorUI = () => {
    const [state, setState] = useState({
        pet: { hp: 0, stamina: 0, energy: 0, level: 0 },
        selectedLevel: null
    });

    useEffect(() => {
        EventBus.on('level-selector-update', (data) => {
            setState(data);
        });

        EventBus.on('error', (data) => {
            alert(data.message); // TODO: Replace with pixel art popup
        });

        return () => {
            EventBus.off('level-selector-update');
            EventBus.off('error');
        };
    }, []);

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                fontFamily: '"Pixelify Sans", cursive',
                color: '#fff'
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    padding: '10px',
                    border: '2px solid #fff',
                    pointerEvents: 'auto'
                }}
            >
                <h3>Pet Status</h3>
                <p>HP: {state.pet.hp}</p>
                <p>Stamina: {state.pet.stamina}</p>
                <p>Energy: {state.pet.energy}</p>
                <p>Level: {state.pet.level}</p>
            </div>
            {state.selectedLevel && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0, 0, 0, 0.7)',
                        padding: '10px',
                        border: '2px solid #fff',
                        textAlign: 'center',
                        maxWidth: '300px',
                        pointerEvents: 'auto'
                    }}
                >
                    <h3>{state.selectedLevel.name}</h3>
                    <p>Difficulty: {state.selectedLevel.selectedDifficulty}</p>
                    <p>Enemies: {state.selectedLevel.enemies.join(', ')}</p>
                    <p>Rewards: {state.selectedLevel.rewards.join(', ')}</p>
                </div>
            )}
        </div>
    );
};

export default LevelSelectorUI;