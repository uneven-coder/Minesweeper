import type { BoardDimensions, CellHandler, GameStartState } from "../types/board.types"
import { difficultySettings } from "../types/board.types"
import { GenerateGameState } from "../script/gameMaker"
import { revealConnectedCells } from "../script/floodfill"
import React from "react"
import { FlagTriangleRight, Bomb } from "lucide-react"

export function calculateBoardDimensions(width: number, height: number, Cols: number, Rows: number): BoardDimensions
{   // Calculate optimal cell size and grid dimensions to fit container
    const cellSize = Math.min(Math.floor(width / Cols), Math.floor(height / Rows));
    const maxPossibleCols = Math.floor(width / cellSize);
    const extraSpace = maxPossibleCols - Cols;
    const fillerCols = extraSpace > 0 ? Math.floor(extraSpace / 2) : 0;
    const totalCols = Cols + (fillerCols * 2);

    return { cellSize, totalCols, actualLeftPadding: fillerCols, actualRightPadding: fillerCols, actualGameCols: Cols };
}

export function getDifficultySettings(difficulty: GameStartState)
{   // Get settings for specified difficulty level
    return difficultySettings[difficulty];
}

export function revealAllMines(cellsRefs: Map<string, CellHandler>): void 
    { cellsRefs.forEach(cellRef => { if (cellRef.getValue() === "M") cellRef.revealCell(); }); }

function clearAllCells(cellsRefs: Map<string, CellHandler>): void
{   // Clear all cell values and reset revealed states
    cellsRefs.forEach(cellRef =>
    {
        cellRef.setValue("");
        cellRef.resetCell();
    });
}

function performChordReveal(x: number, y: number, cellsRefs: Map<string, CellHandler>, Cols: number, Rows: number, onMineHit: () => void): void
{   // Reveal all adjacent cells if flag count matches cell number
    const cellRef = cellsRefs.get(`${x}-${y}`);
    if (!cellRef) return;

    const cellValue = cellRef.getValue();
    const cellNumber = parseInt(cellValue);
    if (isNaN(cellNumber) || cellNumber === 0) return;

    const directions = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
    
    let flagCount = 0;
    const neighbors: Array<{ x: number; y: number; ref: CellHandler }> = [];

    for (const [dx, dy] of directions)
    {   // Count flags and collect unrevealed neighbors
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= Cols || ny < 0 || ny >= Rows) continue;

        const neighbor = cellsRefs.get(`${nx}-${ny}`);
        if (!neighbor) continue;

        if (neighbor.isFlagged()) flagCount++;
        else if (!neighbor.isRevealed()) neighbors.push({ x: nx, y: ny, ref: neighbor });
    }

    if (flagCount !== cellNumber) return;
    
    for (const { x: nx, y: ny, ref: neighbor } of neighbors)
    {   // Reveal all unflagged neighbors
        neighbor.revealCell();

        const neighborValue = neighbor.getValue();
        if (neighborValue === "M") { onMineHit(); return; }
        if (neighborValue === "0") revealConnectedCells(nx, ny, cellsRefs, Cols, Rows);
    }
}

function revealCellAndFloodfill(x: number, y: number, cellsRefs: Map<string, CellHandler>, Cols: number, Rows: number, onMineHit: () => void): void
{   // Reveal cell and trigger floodfill if empty
    const cellRef = cellsRefs.get(`${x}-${y}`);
    if (!cellRef || cellRef.isRevealed()) return;
    
    cellRef.revealCell();
    
    const cellValue = cellRef.getValue();
    if (cellValue === "M") { onMineHit(); return; }
    if (cellValue === "0") revealConnectedCells(x, y, cellsRefs, Cols, Rows);
}

export function handleCellInteraction(x: number, y: number, cellsRefs: Map<string, CellHandler>, getCellKey: (x: number, y: number) => string, Cols: number, Rows: number, gameInitialized: boolean, gameEnded: boolean, onMineHit: () => void, onGameInit: (x: number, y: number) => void): void
{   // Handle cell click with game initialization and reveal logic
    if (gameEnded) return;

    if (!gameInitialized) { onGameInit(x, y); return; }

    const cellRef = cellsRefs.get(getCellKey(x, y));
    if (!cellRef) return;

    if (cellRef.isRevealed())
        performChordReveal(x, y, cellsRefs, Cols, Rows, onMineHit);
    else
        revealCellAndFloodfill(x, y, cellsRefs, Cols, Rows, onMineHit);
}

export function handleCellFlag(x: number, y: number, cellsRefs: Map<string, CellHandler>, getCellKey: (x: number, y: number) => string, gameActive: boolean): boolean
{   // Toggle flag on cell if conditions allow
    if (!gameActive) return false;

    const cellRef = cellsRefs.get(getCellKey(x, y));
    if (!cellRef || cellRef.isRevealed()) return false;

    cellRef.toggleFlag();
    return true;
}

export function initializeGameWithReveal(clickedX: number, clickedY: number, cellsRefs: Map<string, CellHandler>, _getCellKey: (x: number, y: number) => string, difficulty: GameStartState, Cols: number, Rows: number, setGameInitialized: (value: boolean) => void, setGameEnded: (value: boolean) => void): void
{   // Initialize game state and reveal first cell
    GenerateGameState(cellsRefs, difficulty, clickedX, clickedY);
    setGameInitialized(true);
    setTimeout(() => revealCellAndFloodfill(clickedX, clickedY, cellsRefs, Cols, Rows, () => setGameEnded(true)), 0);
}

export function isCellSatisfied(x: number, y: number, cellsRefs: Map<string, CellHandler>, getCellKey: (x: number, y: number) => string, Cols: number, Rows: number): boolean
{   // Check if all adjacent mines are flagged for numbered cells
    const cellRef = cellsRefs.get(getCellKey(x, y));
    if (!cellRef?.isRevealed()) return false;

    const cellValue = cellRef.getValue();
    const cellNumber = parseInt(cellValue);
    if (isNaN(cellNumber) || cellNumber === 0) return false;

    const directions = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
    let flagCount = 0;

    for (const [dx, dy] of directions)
    {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= Cols || ny < 0 || ny >= Rows) continue;

        const neighbor = cellsRefs.get(getCellKey(nx, ny));
        if (neighbor?.isFlagged()) flagCount++;
    }

    return flagCount === cellNumber;
}

export function getCellType(isFiller: boolean, flagged: boolean, revealed: boolean, value: string): string
{   // Determine cell type based on state
    if (isFiller) return "filler";
    if (flagged) return "flagged";
    if (!revealed) return "";
    return value === "M" ? "bomb" : value === "0" ? "empty" : "content";
}

export function getCellTextColor(revealed: boolean, isFiller: boolean, value: string, satisfied?: boolean): string | undefined
{   // Set color for number cells with satisfied state override
    const isNumberCell = revealed && !isFiller && !isNaN(parseFloat(value)) && isFinite(Number(value)) && value !== "0";
    if (!isNumberCell) return undefined;
    return satisfied ? "var(--number-satisfied)" : `var(--number-${value})`;
}

export function getCellContent(flagged: boolean, revealed: boolean, isFiller: boolean, value: string): React.ReactElement | string
{   // Generate cell content based on state
    if (flagged) return React.createElement(FlagTriangleRight, { fill: "#ef4444", strokeWidth: 1, size: 20 });
    if (!revealed || isFiller) return "";
    if (value === "M") return React.createElement(Bomb, { fill: "#000000", strokeWidth: 1, size: 20 });
    return value !== "0" ? value : "";
}

export function createBoardHandle(cellsRefs: Map<string, CellHandler>, getCellKey: (x: number, y: number) => string, gameInitialized: boolean, setGameInitialized: (value: boolean) => void, setGameEnded: (value: boolean) => void, setInitializedDifficulty: (value: GameStartState) => void, setForceResize: (value: (prev: number) => number) => void)
{   // Create imperative handle for board ref with consolidated state management
    return {
        resetGame: (newDifficulty: GameStartState) =>
        {   // Reset game with new difficulty settings
            setGameInitialized(false);
            setGameEnded(false);
            setInitializedDifficulty(newDifficulty);
            clearAllCells(cellsRefs);
            setForceResize(prev => prev + 1);
        },
        getCellRef: (x: number, y: number) => cellsRefs.get(getCellKey(x, y)) || null,
        changeDifficulty: (newDifficulty: GameStartState) =>
        {   // Change difficulty and clear game if not initialized
            if (gameInitialized) return;
            setInitializedDifficulty(newDifficulty);
            clearAllCells(cellsRefs);
            setForceResize(prev => prev + 1);
        },
        endGame: (won: boolean) =>
        {   // End game and prevent further interaction
            setGameEnded(true);
            if (!won) revealAllMines(cellsRefs);
        }
    };
}

export function generateBoardCells(Rows: number, dimensions: BoardDimensions, Cols: number, handleCellClick: (x: number, y: number) => void, handleCellFlag: (x: number, y: number) => void, gameInitialized: boolean, gameEnded: boolean, setCellRef: (x: number, y: number, ref: CellHandler | null) => void, CellComponent: React.ForwardRefExoticComponent<any>, difficulty: GameStartState): React.ReactElement[]
{   // Generate all cell elements for board grid with difficulty and dimensions for satisfaction checks
    const cells: React.ReactElement[] = [];

    for (let y = 0; y < Rows; y++)
        for (let x = 0; x < dimensions.totalCols; x++)
        {   // Create each cell in the grid
            const gameX = x - dimensions.actualLeftPadding;
            const isFiller = gameX < 0 || gameX >= Cols;
            const gridCellKey = isFiller ? `filler-${x}-${y}` : `game-${gameX}-${y}`;

            cells.push(React.createElement(CellComponent, {
                key: gridCellKey, x: gameX, y: y, isFiller: isFiller,
                onCellClick: handleCellClick, onCellFlag: handleCellFlag,
                gameActive: gameInitialized && !gameEnded, gameInitialized: gameInitialized,
                difficulty: difficulty, Cols: Cols, Rows: Rows,
                ref: isFiller ? null : (ref: CellHandler | null) => setCellRef(gameX, y, ref)
            }));
        }

    return cells;
}
