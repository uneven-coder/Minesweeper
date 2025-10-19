import {
    useEffect,
    useState,
    useRef,
    forwardRef,
    useImperativeHandle,
} from "react";
import { GenerateGameState } from "./gameMaker";
import { revealConnectedCells } from "./floodfill";
import { FlagTriangleRight, Bomb } from "lucide-react";

interface BoardDimensions {
    cellSize: number;
    totalCols: number;
    actualLeftPadding: number;
    actualRightPadding: number;
    actualGameCols: number;
}

type GameStartState = keyof typeof difficultySettings;

export const difficultySettings = {
    easy: { width: 16, height: 16, mines: 40 },
    medium: { width: 20, height: 16, mines: 70 },
    hard: { width: 28, height: 16, mines: 110 },
} as const;

interface BoardProps {
    Rows?: number;
    Cols?: number;
    maxBoardHeight?: number;
    onSolve?: (solved: boolean) => void;
    difficulty: GameStartState;
}

export interface BoardHandle {
    resetGame: (difficulty: GameStartState) => void;
    changeDifficulty: (Difficulty: GameStartState) => void;
    getCellRef: (x: number, y: number) => CellHandler | null;
    endGame: (won: boolean) => void;
}

function calculateBoardDimensions(width: number, height: number, Cols: number, Rows: number): BoardDimensions {
    const cellSize = Math.min(
        Math.floor(width / Cols),
        Math.floor(height / Rows)
    );

    const maxPossibleCols = Math.floor(width / cellSize);
    const extraSpace = maxPossibleCols - Cols;
    const fillerCols = extraSpace > 0 ? Math.floor(extraSpace / 2) : 0;
    const totalCols = Cols + (fillerCols * 2);

    return {
        cellSize,
        totalCols,
        actualLeftPadding: fillerCols,
        actualRightPadding: fillerCols,
        actualGameCols: Cols,
    };
};

const Board = forwardRef<BoardHandle, BoardProps>(
    function Board({ maxBoardHeight = 480, difficulty }, ref)
    {   // Main board component managing game state and cell rendering
        const cellsRefs = useRef<Map<string, CellHandler>>(new Map());
        const setCellRef = (x: number, y: number, ref: CellHandler | null): void =>
        {   // Manage cell references for game logic access
            const key = getCellKey(x, y);
            ref ? cellsRefs.current.set(key, ref) : cellsRefs.current.delete(key);
        };

        const boardRef = useRef<HTMLDivElement>(null);
        const [gameInitialized, setGameInitialized] = useState<boolean>(false);
        const [gameEnded, setGameEnded] = useState<boolean>(false);
        const initializedDifficulty = useRef<GameStartState>(difficulty);

        const [boardWidth, setBoardWidth] = useState<number>(100);
        const [boardHeight, setBoardHeight] = useState<number>(100);
        const [forceResize, setForceResize] = useState<number>(0);

        const currentSettings = difficultySettings[initializedDifficulty.current];
        const { width: Cols, height: Rows } = currentSettings;

        const getCellKey = (x: number, y: number): string => `${x}-${y}`;

        const clearAllCells = () =>
        {   // Clear all cell values and reset revealed states
            cellsRefs.current.forEach(cellRef => {
                cellRef.setValue("");
                cellRef.resetCell();
            });
        };

        const initializeGame = (targetDifficulty?: GameStartState, clickedX?: number, clickedY?: number) =>
        {   // Initialize game state with specified difficulty
            const difficultyToUse = targetDifficulty || difficulty;
            initializedDifficulty.current = difficultyToUse;

            clearAllCells();
            GenerateGameState(
                {
                    getCellRef: (x: number, y: number) =>
                    {   // Retrieve cell reference for game state initialization
                        const key = getCellKey(x, y);
                        return cellsRefs.current.get(key) || null;
                    }
                },
                difficultyToUse,
                clickedX,
                clickedY
            );
            setGameInitialized(true);
        };

        const handleCellClick = (x: number, y: number) =>
        {   // Handle individual cell clicks with floodfill support and chord functionality
            if (gameEnded) return;

            if (!gameInitialized)
            {   // Generate game state then reveal clicked cell
                initializeGame(undefined, x, y);
                
                setTimeout(() =>
                {   // Reveal cell and trigger floodfill after game generation
                    const cellRef = cellsRefs.current.get(getCellKey(x, y));
                    if (!cellRef || cellRef.isRevealed()) return;
                    
                    cellRef.revealCell();
                    
                    if (cellRef.getValue() === "M")
                    {
                        setGameEnded(true);
                        revealAllMines();
                        return;
                    }
                    
                    if (cellRef.getValue() === "0")
                        revealConnectedCells(x, y, { getCellRef: (x: number, y: number) => cellsRefs.current.get(getCellKey(x, y)) || null }, Cols, Rows);
                }, 0);
                return;
            }

            const cellRef = cellsRefs.current.get(getCellKey(x, y));
            if (!cellRef) return;

            if (cellRef.isRevealed())
            {
                chordReveal(x, y);
                return;
            }

            cellRef.revealCell();
            
            if (cellRef.getValue() === "M")
            {
                setGameEnded(true);
                revealAllMines();
                return;
            }
            
            if (cellRef.getValue() === "0")
                revealConnectedCells(x, y, { getCellRef: (x: number, y: number) => cellsRefs.current.get(getCellKey(x, y)) || null }, Cols, Rows);
        };

        const revealAllMines = () =>
        {   // Reveal all mine cells when game ends
            cellsRefs.current.forEach(cellRef => {
                if (cellRef.getValue() === "M")
                    cellRef.revealCell();
            });
        };

        const chordReveal = (x: number, y: number) =>
        {   // Reveal all adjacent cells if flag count matches cell number
            const cellRef = cellsRefs.current.get(getCellKey(x, y));
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

                const neighbor = cellsRefs.current.get(getCellKey(nx, ny));
                if (!neighbor) continue;

                if (neighbor.isFlagged()) flagCount++;
                else if (!neighbor.isRevealed()) neighbors.push({ x: nx, y: ny, ref: neighbor });
            }

            if (flagCount !== cellNumber) return;

            for (const { x: nx, y: ny, ref: neighbor } of neighbors)
            {   // Reveal all unflagged neighbors
                neighbor.revealCell();

                if (neighbor.getValue() === "M")
                {
                    setGameEnded(true);
                    revealAllMines();
                    return;
                }

                if (neighbor.getValue() === "0")
                    revealConnectedCells(nx, ny, { getCellRef: (x: number, y: number) => cellsRefs.current.get(getCellKey(x, y)) || null }, Cols, Rows);
            }
        };

        useImperativeHandle(ref, () => ({
            resetGame: (newDifficulty: GameStartState) =>
            {   // Reset game with new difficulty settings
                setGameInitialized(false);
                setGameEnded(false);
                initializedDifficulty.current = newDifficulty;
                clearAllCells();
                setForceResize(prev => prev + 1);
            },
            getCellRef: (x: number, y: number): CellHandler | null =>
            {   // Retrieve specific cell reference
                const key = getCellKey(x, y);
                return cellsRefs.current.get(key) || null;
            },
            changeDifficulty: (newDifficulty: GameStartState) =>
            {   // Change difficulty and clear game if not initialized
                if (!gameInitialized)
                {   // Update board dimensions for uninitialized game
                    initializedDifficulty.current = newDifficulty;
                    clearAllCells();
                    setForceResize(prev => prev + 1);
                }
            },
            endGame: (won: boolean) =>
            {   // End game and prevent further interaction
                setGameEnded(true);
                if (!won) revealAllMines();
            }
        }))

        useEffect(() => {
            const updateDimensions = () => {
                if (!boardRef.current) return;
                setBoardWidth(boardRef.current.clientWidth);
                setBoardHeight(Math.min(boardRef.current.clientHeight, maxBoardHeight));
            };

            updateDimensions();
            window.addEventListener("resize", updateDimensions);

            return () => window.removeEventListener("resize", updateDimensions);
        }, [maxBoardHeight, forceResize]);


        const dimensions = calculateBoardDimensions(boardWidth, boardHeight, Cols, Rows);

        const cells = [];
        for (let y = 0; y < Rows; y++)
        {
            for (let x = 0; x < dimensions.totalCols; x++)
            {
                const gameX = x - dimensions.actualLeftPadding;
                const isFiller = gameX < 0 || gameX >= Cols;
                const gridCellKey = isFiller ? `filler-${x}-${y}` : `game-${gameX}-${y}`;

                cells.push(
                    <Cell
                        key={gridCellKey}
                        x={gameX}
                        y={y}
                        isFiller={isFiller}
                        onCellClick={handleCellClick}
                        gameActive={gameInitialized && !gameEnded}
                        ref={isFiller ? null : (ref) => setCellRef(gameX, y, ref)}
                    />
                );
            }
        }

        return (
            <div
                id="board"
                ref={boardRef}
                className="w-full max-w-[950px] mx-auto flex-1 bg-base-100 text-base-content grid gap-0"
                style={{
                    gridTemplateColumns: `repeat(${dimensions.totalCols}, ${dimensions.cellSize}px)`,
                    gridTemplateRows: `repeat(${Rows}, ${dimensions.cellSize}px)`,
                    justifyContent: "center",
                    alignContent: "center",
                    maxHeight: `${maxBoardHeight}px`,
                }}
            >
                {cells}
            </div>
        );
    }
);

export type CellState = "empty" | "content" | "hidden" | "flagged" | "bomb";

interface CellProps {
    x: number;
    y: number;
    isFiller: boolean;
    onCellClick: (x: number, y: number) => void;
    gameActive: boolean;
}

export interface CellHandler {
    revealCell: () => void;
    getValue: () => string;
    isRevealed: () => boolean;
    setValue: (value: string) => void;
    resetCell: () => void;
    toggleFlag: () => void;
    isFlagged: () => boolean;
}

const Cell = forwardRef<CellHandler, CellProps>(function Cell({ x, y, isFiller, onCellClick, gameActive }, ref)
{
    const [isRevealed, setIsRevealed] = useState<boolean>(false);
    const [cellValue, setCellValue] = useState<string>("");
    const [isFlagged, setIsFlagged] = useState<boolean>(false);

    useImperativeHandle(ref, () => ({
        revealCell: () => setIsRevealed(true),
        getValue: () => cellValue,
        isRevealed: () => isRevealed,
        setValue: (value: string) => setCellValue(value),
        resetCell: () => { setIsRevealed(false); setIsFlagged(false); },
        toggleFlag: () => setIsFlagged(prev => !prev),
        isFlagged: () => isFlagged
    }));

    const handleClick = () =>
    {   // Handle cell click to reveal or trigger chord on revealed cells
        if (isFiller || (!isRevealed && isFlagged)) return;
        onCellClick(x, y);
    };

    const handleRightClick = (e: React.MouseEvent) =>
    {   // Handle right click to toggle flag only when game is active
        e.preventDefault();
        if (isFiller || isRevealed || !gameActive) return;
        setIsFlagged(prev => !prev);
    };

    const isLight = (x + y) % 2 === 0;
    const lightDarkClass = isLight ? "cell-light" : "cell-dark";

    const getCellType = () =>
    {   // Return appropriate cell type based on state
        if (isFiller) return "filler";
        if (isFlagged) return "flagged";
        if (!isRevealed) return "";
        if (cellValue === "M") return "bomb";
        return cellValue === "0" ? "empty" : "content";
    };

    const getTextColor = () =>
    {   // Return color for revealed number cells
        if (!isRevealed || isFiller) return undefined;
        const isNumber = !isNaN(parseFloat(cellValue)) && isFinite(Number(cellValue)) && cellValue !== "0";
        return isNumber ? `var(--number-${cellValue})` : undefined;
    };

    const getCellContent = () =>
    {   // Return appropriate content for cell state
        if (isFlagged) return <FlagTriangleRight fill="#ef4444" strokeWidth={1} size={16} />;
        if (!isRevealed || isFiller) return "";
        if (cellValue === "M") return <Bomb fill="#ffffff" strokeWidth={0} size={16} />;
        return cellValue !== "0" ? cellValue : "";
    };

    const cellType = getCellType();
    const textColor = getTextColor();
    const cellContent = getCellContent();

    const Tag = isFiller ? "div" : "button";
    return (
        <Tag
            className={`cell ${cellType} ${lightDarkClass} flex items-center justify-center text-xs font-bold`}
            style={textColor ? { color: textColor } : undefined}
            onClick={handleClick}
            onContextMenu={handleRightClick}
        >
            {cellContent}
        </Tag>
    );
});



export default Board;





