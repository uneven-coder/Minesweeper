export const difficultySettings = {
    easy: { width: 16, height: 16, mines: 40 },
    medium: { width: 20, height: 16, mines: 70 },
    hard: { width: 28, height: 16, mines: 110 },
} as const;

export type GameStartState = keyof typeof difficultySettings;

export interface CellHandler
{
    setValue: (value: string) => void;
    revealCell: () => void;
    getValue: () => string;
    isRevealed: () => boolean;
    resetCell: () => void;
    toggleFlag: () => void;
    isFlagged: () => boolean;
}

export interface BoardDimensions
{
    cellSize: number;
    totalCols: number;
    actualLeftPadding: number;
    actualRightPadding: number;
    actualGameCols: number;
}

export interface BoardHandle
{
    resetGame: (difficulty: GameStartState) => void;
    changeDifficulty: (Difficulty: GameStartState) => void;
    getCellRef: (x: number, y: number) => CellHandler | null;
    endGame: (won: boolean) => void;
}

export type GridCell = number | string;
export type GameGrid = Array<Array<GridCell>>;
export type Direction = [number, number];
