interface BoardRef {
    getCellRef: (x: number, y: number) => { TESTsetValue: (value: number) => void } | null;
}

const difficultySettings = {
    easy: { width: 16, height: 16, mines: 40 },
    medium: { width: 20, height: 16, mines: 70 },
    hard: { width: 28, height: 16, mines: 140 },
} as const;



export function GenerateGameState(boardRef?: BoardRef, difficulty: keyof typeof difficultySettings = 'easy')
{   // Generate game state and set test values for all cells
    
    if (!boardRef) 
        return {};

    const settings = difficultySettings[difficulty];
    
    // Set test values for all game cells (x + y)
    for (let y = 0; y < settings.height; y++)
    {   // Process each row of the game board
        for (let x = 0; x < settings.width; x++)
        {   // Set each cell's test value to coordinate sum
            const cellRef = boardRef.getCellRef(x, y);
            if (cellRef)
                cellRef.TESTsetValue(x + y);
        }
    }

    return {};
}

