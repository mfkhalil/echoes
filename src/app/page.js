"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, Crosshair, RotateCcw } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const ECHO_DELAY = 5;

const EchoSurvival = () => {
    const [gridSize, setGridSize] = useState(4);
    const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
    const [moveHistory, setMoveHistory] = useState([]);
    const [score, setScore] = useState(0);
    const [highScores, setHighScores] = useState(() => {
        // Load high scores from localStorage on initial render
        const savedScores = localStorage.getItem('echoes-high-scores');
        return savedScores ? JSON.parse(savedScores) : {};
    });
    const [gameState, setGameState] = useState('playing');
    const [showInstructions, setShowInstructions] = useState(true);
    const [showHints, setShowHints] = useState(false);
    const instructionsRef = useRef(null);

    // Save high scores to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('echoes-high-scores', JSON.stringify(highScores));
    }, [highScores]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (instructionsRef.current && !instructionsRef.current.contains(event.target)) {
                // Check if the click was not on the help button
                const helpButton = event.target.closest('button');
                if (!helpButton || !helpButton.classList.contains('help-button')) {
                    setShowInstructions(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get current echo positions with their numbers
    const getCurrentEchoPositions = () => {
        const positions = [];
        const numberOfEchoes = Math.floor(moveHistory.length / ECHO_DELAY);

        for (let i = 1; i <= numberOfEchoes; i++) {
            const index = moveHistory.length - (i * ECHO_DELAY);
            if (index >= 0) {
                positions.push({
                    pos: moveHistory[index],
                    number: i
                });
            }
        }
        return positions;
    };

    // Get next positions for hints
    const getNextEchoPositions = () => {
        const positions = [];
        const numberOfEchoes = Math.floor(moveHistory.length / ECHO_DELAY);

        for (let i = 1; i <= numberOfEchoes; i++) {
            const currentIndex = moveHistory.length - (i * ECHO_DELAY);
            const nextIndex = currentIndex + 1;
            if (currentIndex >= 0 && nextIndex < moveHistory.length) {
                positions.push({
                    current: moveHistory[currentIndex],
                    next: moveHistory[nextIndex],
                    number: i
                });
            }
        }
        return positions;
    };

    const resetGame = useCallback(() => {
        setPlayerPos({ x: 0, y: 0 });
        setMoveHistory([]);
        setScore(0);
        setGameState('playing');
        setShowHints(false);
    }, []);

    const changeGridSize = (newSize) => {
        setGridSize(Number(newSize));
        resetGame();
    };

    const movePlayer = (dx, dy) => {
        if (gameState !== 'playing') return;

        const newX = playerPos.x + dx;
        const newY = playerPos.y + dy;

        if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
            const newPlayerPos = { x: newX, y: newY };
            const newHistory = [...moveHistory, playerPos];

            const nextEchoes = [];
            const numberOfEchoes = Math.floor((newHistory.length) / ECHO_DELAY);

            for (let i = 1; i <= numberOfEchoes; i++) {
                const index = newHistory.length - (i * ECHO_DELAY);
                if (index >= 0) {
                    nextEchoes.push({
                        pos: newHistory[index],
                        number: i
                    });
                }
            }

            const collision = nextEchoes.some(echo =>
                echo.pos && echo.pos.x === newPlayerPos.x && echo.pos.y === newPlayerPos.y
            );

            if (collision) {
                setGameState('gameover');
                setHighScores(prev => ({
                    ...prev,
                    [gridSize]: Math.max(prev[gridSize] || 0, score + 1)
                }));
            }

            setPlayerPos(newPlayerPos);
            setMoveHistory(newHistory);
            setScore(prev => prev + 1);
        }
    };

    useEffect(() => {
        const handleKeyPress = (e) => {
            // Prevent default behavior for arrow keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();

                switch (e.key) {
                    case 'ArrowUp': movePlayer(0, -1); break;
                    case 'ArrowDown': movePlayer(0, 1); break;
                    case 'ArrowLeft': movePlayer(-1, 0); break;
                    case 'ArrowRight': movePlayer(1, 0); break;
                }
            }

            if (e.key.toLowerCase() === 'r') {
                resetGame();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [playerPos, gameState, score, moveHistory, gridSize, resetGame]);

    const echoPositions = getCurrentEchoPositions();

    // Direction indicator component
    const DirectionIndicator = ({ from, to }) => {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        let rotation = 0;

        if (dx > 0) rotation = 0;
        else if (dx < 0) rotation = 180;
        else if (dy > 0) rotation = 90;
        else rotation = -90;

        return (
            <div className="absolute inset-0 flex items-center justify-center">
                <div
                    className="w-6 h-2 bg-white"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        clipPath: 'polygon(0 0, 100% 50%, 0 100%)'
                    }}
                />
            </div>
        );
    };

    return (
        <div className="h-screen bg-zinc-900 flex items-center justify-center">
            <div className="relative max-w-lg w-full mx-auto p-4 flex flex-col items-center">
                <div className="w-full text-center mb-8">
                    <h1 className="text-5xl font-bold mb-4 font-mono bg-gradient-to-r from-amber-300 to-pink-500 bg-clip-text text-transparent">
                        ECHOES
                    </h1>
                    <div className="flex justify-between items-center">
                        <div className="font-mono text-lg text-zinc-300">Score: {score}</div>
                        <div className="flex gap-4 items-center">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Select
                                            value={String(gridSize)}
                                            onValueChange={changeGridSize}
                                        >
                                            <SelectTrigger className="w-fit h-8 text-xs bg-transparent border-zinc-700 text-zinc-400">
                                                <SelectValue placeholder={`${gridSize}x${gridSize}`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[2, 3, 4, 5, 6, 7, 8].map(size => (
                                                    <SelectItem key={size} value={String(size)}>
                                                        {size}x{size}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TooltipTrigger>
                                    <TooltipContent>Change grid size</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={resetGame}
                                            className="p-2 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors"
                                        >
                                            <RotateCcw size={20} />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reset game (R)</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="font-mono text-lg text-zinc-300">Best: {highScores[gridSize] || 0}</div>
                    </div>
                </div>

                <div className="absolute top-4 right-4 flex gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setShowHints(prev => !prev)}
                                    className={`p-2 rounded-full transition-colors ${showHints
                                            ? 'bg-pink-500/20 text-pink-500'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    <Crosshair size={20} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Show echo predictions</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setShowInstructions(prev => !prev)}
                                    className={`help-button p-2 rounded-full transition-colors ${showInstructions
                                            ? 'bg-zinc-700 text-zinc-300'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    <HelpCircle size={20} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>How to play</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {showInstructions && (
                    <div
                        ref={instructionsRef}
                        className="fixed inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-full max-w-[600px] bg-zinc-800/95 backdrop-blur p-6 rounded-lg shadow-xl text-zinc-300 text-sm z-10 border border-zinc-700"
                    >
                        <button
                            onClick={() => setShowInstructions(false)}
                            className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        <h3 className="text-lg font-semibold mb-4 text-center">How to Play</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-zinc-400 text-lg">🎮</span>
                                <span>Use <kbd className="px-2 py-1 bg-zinc-700 rounded">←↑↓→</kbd> to move</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-pink-500 text-lg">●</span>
                                <span>Every {ECHO_DELAY} moves creates an echo that follows your path</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-amber-400 text-lg">●</span>
                                <span>Avoid colliding with <span className="text-pink-500 font-bold">echoes</span></span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-zinc-400 text-lg">💥</span>
                                <span>Collisions occur when moving to the same square simultaneously</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-zinc-400 text-lg">🎯</span>
                                <span>Survive as long as possible to maximize your score</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-zinc-400 text-lg">🔍</span>
                                <span>Toggle hints <Crosshair className="inline h-4 w-4" /> to see white arrows showing where each echo will move next</span>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="px-6 py-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium rounded-lg transition-colors shadow-lg"
                            >
                                Start Playing
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid gap-2 bg-zinc-800 p-6 rounded-lg shadow-xl">
                    {[...Array(gridSize)].map((_, y) => (
                        <div key={y} className="flex gap-2">
                            {[...Array(gridSize)].map((_, x) => {
                                const isPlayer = playerPos.x === x && playerPos.y === y;
                                const echoPosition = echoPositions.find(
                                    echo => echo.pos?.x === x && echo.pos?.y === y
                                );
                                const isEcho = !!echoPosition;

                                return (
                                    <div
                                        key={`${x}-${y}`}
                                        className="relative w-14 h-14"
                                    >
                                        <div
                                            className={`
                                                w-full h-full rounded-md transition-colors duration-100 relative
                                                ${isPlayer ? 'bg-amber-400 shadow-lg' : ''}
                                                ${isEcho ? 'bg-pink-500' : ''}
                                                ${!isPlayer && !isEcho ? 'bg-zinc-700' : ''}
                                            `}
                                        >
                                            {isEcho && (
                                                <div className="absolute top-1 left-1 text-xs text-white/80 font-mono">
                                                    {echoPosition.number}
                                                </div>
                                            )}
                                        </div>

                                        {showHints && getNextEchoPositions().map(echo => {
                                            if (echo.current?.x === x && echo.current?.y === y) {
                                                return (
                                                    <div className="absolute inset-0">
                                                        <DirectionIndicator
                                                            key={echo.number}
                                                            from={echo.current}
                                                            to={echo.next}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {gameState === 'gameover' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="text-2xl font-bold mb-4 font-mono text-zinc-300">Game Over!</div>
                            <button
                                onClick={resetGame}
                                className="px-6 py-3 bg-gradient-to-r from-amber-400 to-pink-500 text-zinc-900 rounded-lg font-mono shadow-lg hover:shadow-xl transition-all hover:scale-105"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-6 text-sm text-zinc-500 text-center font-mono">
                    {echoPositions.length} echo{echoPositions.length !== 1 ? 'es' : ''} following you
                </div>
            </div>
        </div>
    );
};

export default EchoSurvival;