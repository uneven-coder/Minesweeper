import {
    useEffect,
    useState,
    useRef,
    forwardRef,
    useImperativeHandle,
} from "react";
import { GenerateGameState } from "./gameMaker";

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
    hard: { width: 28, height: 16, mines: 140 },
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
    getCellRef: (x: number, y: number) => CellHandler | null;
}

function calculateBoardDimensions(width: number, height: number, Cols: number, Rows: number): BoardDimensions
{
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
    function Board({ maxBoardHeight = 500, difficulty }, ref)
    {   // Main board component managing game state and cell rendering
        const cellsRefs = useRef<Map<string,CellHandler>>(new Map());
        const setCellRef = (x: number, y: number, ref: CellHandler | null): void =>
        {   // Manage cell references for game logic access
            const key = getCellKey(x, y);
            ref ? cellsRefs.current.set(key, ref) : cellsRefs.current.delete(key);
        };

        const boardRef = useRef<HTMLDivElement>(null);
        const gameInitialized = useRef<boolean>(false);
        const pendingDifficulty = useRef<GameStartState | null>(null);

        const [boardWidth, setBoardWidth] = useState<number>(100);
        const [boardHeight, setBoardHeight] = useState<number>(100);

        const [activeDifficulty, setActiveDifficulty] = useState<GameStartState>(difficulty);
        const currentSettings = difficultySettings[activeDifficulty];
        const { width: Cols, height: Rows } = currentSettings;

        const getCellKey = (x: number, y: number): string => `${x}-${y}`;

        const clearAllCells = () =>
            cellsRefs.current.forEach(cellRef => cellRef.TESTsetValue(""));

        const initializeGame = (targetDifficulty?: GameStartState) =>
        {   // Initialize game state with specified difficulty
            const difficultyToUse = targetDifficulty || activeDifficulty;
            
            clearAllCells();
            GenerateGameState(
                {
                    getCellRef: (x: number, y: number) =>
                    {   // Retrieve cell reference for game state initialization
                        const key = getCellKey(x, y);
                        return cellsRefs.current.get(key) || null;
                    }
                },
                difficultyToUse
            );
            gameInitialized.current = true;
            pendingDifficulty.current = null;
        };

        useImperativeHandle(ref, () => ({
            resetGame: (newDifficulty: GameStartState) =>
            {   // Reset game with new difficulty settings and update board dimensions
                gameInitialized.current = false;
                pendingDifficulty.current = newDifficulty;
                setActiveDifficulty(newDifficulty);
            },
            getCellRef: (x: number, y: number): CellHandler | null =>
            {   // Retrieve specific cell reference
                const key = getCellKey(x, y);
                return cellsRefs.current.get(key) || null;
            },
        }))

        useEffect(() =>
        {
            const updateDimensions = () =>
            {
                if (!boardRef.current) return;
                setBoardWidth(boardRef.current.clientWidth);
                setBoardHeight(Math.min(boardRef.current.clientHeight, maxBoardHeight));
            };

            updateDimensions();
            window.addEventListener("resize", updateDimensions);

            return () => window.removeEventListener("resize", updateDimensions);
        }, [maxBoardHeight]);

        useEffect(() =>
        {   // Initialize game when difficulty changes or handle pending initialization
            if (!gameInitialized.current && pendingDifficulty.current)
                initializeGame(pendingDifficulty.current);
            else if (!gameInitialized.current)
                initializeGame();
        }, [activeDifficulty]);

        const dimensions = calculateBoardDimensions(boardWidth, boardHeight, Cols, Rows);

        // Generate cells array with stable keys
        const cells = [];
        for (let y = 0; y < Rows; y++) {
            for (let x = 0; x < dimensions.totalCols; x++) {
                const gameX = x - dimensions.actualLeftPadding;
                const isFiller = gameX < 0 || gameX >= Cols;
                
                const gridCellKey = isFiller ? `filler-${x}-${y}` : `game-${gameX}-${y}`;

                cells.push(
                    <Cell 
                        key={gridCellKey}
                        x={gameX} 
                        y={y} 
                        isFiller={isFiller}
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
    });

interface CellProps {
    x: number;
    y: number;
    isFiller: boolean;
}

export interface CellHandler {
    TESTsetValue: (value: string) => void;
}

const Cell = forwardRef<CellHandler, CellProps>(function Cell({ x, y, isFiller }, ref)
{
    const [TestValue, setTestValue] = useState<string>("");

    useImperativeHandle(ref, () => ({
        TESTsetValue: (value: string): void => setTestValue(value),
    }));

    const isLight = (x + y) % 2 === 0;
    const lightDarkClass = isLight ? "cell-light" : "cell-dark";
    const cellClass = isFiller ? `filler ${lightDarkClass}` : `cell ${lightDarkClass}`;

    const isNumber = !isNaN(parseFloat(TestValue)) && isFinite(Number(TestValue));
    const textColor = isNumber ? `var(--number-${TestValue})` : undefined;

    return (
        <div
            className={`${cellClass} flex items-center justify-center text-xs font-bold`}
            style={textColor ? { color: textColor } : undefined}
        >
            {!isFiller && TestValue}
        </div>
    );
});


export default Board;





