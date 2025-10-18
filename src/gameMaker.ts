import { useState } from "react";

// Custom hook to manage game seed
export function useGameSeed() {
    const [seed, setGameSeed] = useState<number>();

    const generateNewSeed = (): void => {
        const min: number = 1000;
        const max: number = 9999;
        setGameSeed(Math.floor(Math.random() * (max - min + 1)) + min);
    };

    return { seed, generateNewSeed };
}

