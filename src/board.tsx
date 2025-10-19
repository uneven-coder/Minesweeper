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

function calculateBoardDimensions(width: number, height: number, Cols: number, Rows: number): BoardDimensions {
    // Calculate optimal cell size and ensure even filler distribution
    const cellSize = Math.min(
        Math.floor(width / Cols),
        Math.floor(height / Rows)
    );
    const maxPossibleCols = Math.floor(width / cellSize);

    // Ensure even distribution by using only even number of extra columns
    const extraCols = maxPossibleCols - Cols;
    const evenExtraCols = extraCols > 0 ? Math.floor(extraCols / 2) * 2 : 0;
    const fillerCols = evenExtraCols / 2;
    const totalCols = Cols + evenExtraCols;

    return {
        cellSize,
        totalCols,
        actualLeftPadding: fillerCols,
        actualRightPadding: fillerCols,
        actualGameCols: Cols,
    };
};

const Board = forwardRef<BoardHandle, BoardProps>(
    function Board({ maxBoardHeight = 500, difficulty }, ref) {
        const cells = [];
        const cellsRefs = useRef<Map<string,CellHandler>>(new Map());
        const setCellRef = (x: number, y: number, ref: CellHandler | null): void =>
        {
            const key = getCellKey(x, y);
            ref ? cellsRefs.current.set(key, ref) : cellsRefs.current.delete(key);
        };
        const boardRef = useRef<HTMLDivElement>(null);

        const [boardWidth, setBoardWidth] = useState<number>(100);
        const [boardHeight, setBoardHeight] = useState<number>(100);

        const [currentDifficulty, setCurrentDifficulty] = useState<GameStartState>(difficulty);
        const currentSettings = difficultySettings[currentDifficulty];
        const { width: Cols, height: Rows } = currentSettings;

        const getCellKey = (x: number, y: number): string => `${x}-${y}`;

        useImperativeHandle(ref, () => ({
            resetGame: (newDifficulty: GameStartState) => {
                setCurrentDifficulty(newDifficulty);
                GenerateGameState(
                    {
                        getCellRef: (x: number, y: number) => {
                            const key = getCellKey(x, y);
                            return cellsRefs.current.get(key) || null;
                        }
                    },
                    newDifficulty
                );
            },
            getCellRef: (x: number, y: number): CellHandler | null =>
            {   // Retrieve specific cell reference
                const key = getCellKey(x, y);
                return cellsRefs.current.get(key) || null;
            },
        }))

        useEffect(() =>
        {   // Update size onStart and onChange
            const updateDimensions = () =>
            {   // Recalculate board dimensions when container size changes
                if (!boardRef.current) return;
                setBoardWidth(boardRef.current.clientWidth);
                setBoardHeight(Math.min(boardRef.current.clientHeight, maxBoardHeight));
            };

            updateDimensions();
            window.addEventListener("resize", updateDimensions);

            return () => window.removeEventListener("resize", updateDimensions);
        }, [maxBoardHeight]);



        useEffect(() =>
        {   // Run initialization when all cells are mounted
            const initializeGame = () =>
            {   // Set up initial game state with test values
                GenerateGameState(
                    {
                        getCellRef: (x: number, y: number) =>
                        {   // Retrieve cell reference for game state initialization
                            const key = getCellKey(x, y);
                            return cellsRefs.current.get(key) || null;
                        }
                    },
                    currentDifficulty
                );
            };

            if (cellsRefs.current.size === Cols * Rows)
                initializeGame();
        }, [cellsRefs.current.size, Cols, Rows, currentDifficulty]);

        const dimensions = calculateBoardDimensions(boardWidth, boardHeight, Cols, Rows);

        for (let y = 0; y < Rows; y++) {
            for (let x = 0; x < dimensions.totalCols; x++) {
                const gameX = x - dimensions.actualLeftPadding;
                const isFiller = gameX < 0 || gameX >= Cols;

                cells.push(
                    <Cell 
                        key={`${x}-${y}`} 
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
    TESTsetValue: (value: number) => void;
}

const Cell = forwardRef<CellHandler, CellProps>(
function Cell({ x, y, isFiller }, ref) {
    const [TestValue, setTestValue] = useState<number>(0);
    
    useImperativeHandle(ref, () => ({
        TESTsetValue: (value: number): void => setTestValue(value),
    }));


    // Render individual cell with checkered background pattern
    const isLight = (x + y) % 2 === 0;
    const lightDarkClass = isLight ? "cell-light" : "cell-dark";
    const cellClass = isFiller
        ? `filler ${lightDarkClass}`
        : `cell ${lightDarkClass}`;

    return (
        <div
            className={`${cellClass} flex items-center justify-center text-xs font-bold`}
        >
            {/* {!isFiller ? `${x},${y}` : ""}*/}
            {!isFiller && TestValue}
        </div>
    );
});

export default Board;





