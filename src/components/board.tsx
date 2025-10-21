import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import type { GameStartState, BoardHandle, CellHandler } from "../types/board.types";
import * as boardUtils from "../script/board.utils";

interface GameState
{
    initialized: boolean;
    ended: boolean;
    difficulty: GameStartState;
}

interface BoardSize
{
    width: number;
    height: number;
    resizeKey: number;
}

export const Board = forwardRef<BoardHandle, { maxBoardHeight?: number; difficulty: GameStartState }>(
    function Board({ maxBoardHeight = 480, difficulty }, ref)
    {   // Main board component managing game state and cell rendering
        const cellsRefs = useRef<Map<string, CellHandler>>(new Map());
        const boardRef = useRef<HTMLDivElement>(null);
        const [gameState, setGameState] = useState<GameState>({ initialized: false, ended: false, difficulty });
        const [boardSize, setBoardSize] = useState<BoardSize>({ width: 100, height: 100, resizeKey: 0 });

        const currentSettings = boardUtils.getDifficultySettings(gameState.difficulty);
        const { width: Cols, height: Rows } = currentSettings;
        const getCellKey = (x: number, y: number): string => `${x}-${y}`;

        const setCellRef = (x: number, y: number, ref: CellHandler | null): void =>
        {
            const key = getCellKey(x, y);
            ref ? cellsRefs.current.set(key, ref) : cellsRefs.current.delete(key);
        };

        const handleCellClick = (x: number, y: number) => boardUtils.handleCellInteraction(
            x, y, cellsRefs.current, getCellKey, Cols, Rows, gameState.initialized, gameState.ended,
            () => { setGameState(prev => ({ ...prev, ended: true })); boardUtils.revealAllMines(cellsRefs.current); },
            (cx, cy) => boardUtils.initializeGameWithReveal(
                cx, cy, cellsRefs.current, getCellKey, gameState.difficulty, Cols, Rows,
                (initialized) => setGameState(prev => ({ ...prev, initialized })),
                (ended) => setGameState(prev => ({ ...prev, ended }))
            )
        );

        const handleCellFlag = (x: number, y: number) => boardUtils.handleCellFlag(x, y, cellsRefs.current, getCellKey, gameState.initialized && !gameState.ended);

        useImperativeHandle(ref, () => boardUtils.createBoardHandle(
            cellsRefs.current, getCellKey, gameState.initialized,
            (initialized) => setGameState(prev => ({ ...prev, initialized })),
            (ended)       => setGameState(prev => ({ ...prev, ended })),
            (difficulty)  => setGameState(prev => ({ ...prev, difficulty })),
            (updater)     => setBoardSize(prev => ({ ...prev, resizeKey: updater(prev.resizeKey) }))
        ));

        useEffect(() =>
        {   // Update board dimensions on resize
            const updateDimensions = () =>
            {
                if (!boardRef.current) return;
                setBoardSize(prev => ({...prev,
                    width: boardRef.current!.clientWidth,
                    height: Math.min(boardRef.current!.clientHeight, maxBoardHeight)
                }));
            };

            updateDimensions();
            window.addEventListener("resize", updateDimensions);
            return () => window.removeEventListener("resize", updateDimensions);
        }, [maxBoardHeight, boardSize.resizeKey]);

        const dimensions = boardUtils.calculateBoardDimensions(boardSize.width, boardSize.height, Cols, Rows);
        const cells = boardUtils.generateBoardCells(Rows, dimensions, Cols, handleCellClick, handleCellFlag, gameState.initialized, gameState.ended, setCellRef, Cell, gameState.difficulty);

        return (
            <div id="board" ref={boardRef} className="w-full max-w-[950px] mx-auto flex-1 bg-base-100 text-base-content grid gap-0"
                 style={{ gridTemplateColumns: `repeat(${dimensions.totalCols}, ${dimensions.cellSize}px)`,
                         gridTemplateRows: `repeat(${Rows}, ${dimensions.cellSize}px)`,
                         justifyContent: "center", alignContent: "center", maxHeight: `${maxBoardHeight}px` }}>
                {cells}
            </div>
        );
    }
);

const Cell = forwardRef<CellHandler, { x: number; y: number; isFiller: boolean; onCellClick: (x: number, y: number) => void; onCellFlag: (x: number, y: number) => void; gameActive: boolean; gameInitialized: boolean; difficulty: GameStartState; Cols: number; Rows: number }>(
    function Cell({ x, y, isFiller, onCellClick, onCellFlag, gameActive: _gameActive, gameInitialized, difficulty: _difficulty, Cols, Rows }, ref)
    {   // Individual cell component with reveal and flag states
        // Tracks satisfaction state for cells where all adjacent mines are flagged
        const [cellState, setCellState] = useState({ revealed: false, value: "", flagged: false });
        const [satisfied, setSatisfied] = useState(false);

        const checkSatisfaction = (): void =>
        {   // Check if this cell's mine count is satisfied by adjacent flags
            if (!gameInitialized || !cellState.revealed || isFiller)
            {
                setSatisfied(false);
                return;
            }

            const parentBoard = document.getElementById("board");
            if (!parentBoard) return;

            const allCells = parentBoard.querySelectorAll(".cell:not(.filler)");
            const tempCellsRefs = new Map<string, CellHandler>();

            allCells.forEach((cell) =>
            {   // Build temporary cell reference map from DOM state
                const button = cell as HTMLButtonElement;
                const dataPos = button.getAttribute("data-pos");
                if (!dataPos) return;

                const [cx, cy] = dataPos.split("-").map(Number);
                const dataValue = button.getAttribute("data-value") || "";
                const isContentOrEmpty = button.classList.contains("content") || button.classList.contains("empty") || button.classList.contains("satisfied");
                const isFlagged = button.classList.contains("flagged");

                tempCellsRefs.set(`${cx}-${cy}`, {
                    revealCell: () => {},
                    getValue: () => dataValue,
                    isRevealed: () => isContentOrEmpty,
                    setValue: () => {},
                    resetCell: () => {},
                    toggleFlag: () => {},
                    isFlagged: () => isFlagged
                });
            });

            const isSatisfied = boardUtils.isCellSatisfied(x, y, tempCellsRefs, (cx, cy) => `${cx}-${cy}`, Cols, Rows);
            setSatisfied(isSatisfied);
        };

        const triggerAdjacentUpdates = (): void =>
        {   // Trigger satisfaction check on all adjacent numbered cells
            const directions = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0,0]];
            
            directions.forEach(([dx, dy]) =>
            {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= Cols || ny < 0 || ny >= Rows) return;

                const adjacentCell = document.querySelector(`[data-pos="${nx}-${ny}"]`);
                if (adjacentCell)
                    adjacentCell.dispatchEvent(new CustomEvent("checkSatisfaction"));
            });
        };

        useImperativeHandle(ref, () => ({
            revealCell: () =>
            {   // Reveal cell and trigger adjacent satisfaction checks
                setCellState(prev => ({ ...prev, revealed: true }));
                setTimeout(() => { checkSatisfaction(); triggerAdjacentUpdates(); }, 0);
            },
            getValue: () => cellState.value,
            isRevealed: () => cellState.revealed,
            setValue: (value: string) =>
            {   // Set value and check if this affects adjacent cells
                setCellState(prev => ({ ...prev, value }));
                setTimeout(() => { checkSatisfaction(); triggerAdjacentUpdates(); }, 0);
            },
            resetCell: () => { setCellState({ revealed: false, value: "", flagged: false }); setSatisfied(false); },
            toggleFlag: () =>
            {   // Toggle flag and notify adjacent cells to recheck satisfaction
                setCellState(prev => ({ ...prev, flagged: !prev.flagged }));
                setTimeout(() => { checkSatisfaction(); triggerAdjacentUpdates(); }, 0);
            },
            isFlagged: () => cellState.flagged
        }));

        useEffect(function satisfactionUpdateNeighbors() 
        {   // Set up custom event listener for satisfaction checks triggered by neighbors
            const element = document.querySelector(`[data-pos="${x}-${y}"]`);
            if (!element) return;

            const handler = () => checkSatisfaction();
            element.addEventListener("checkSatisfaction", handler);

            return () => element.removeEventListener("checkSatisfaction", handler);
        }, [gameInitialized, cellState.revealed, cellState.value, x, y, Cols, Rows]);

        useEffect(function CheckSatisfaction() {
           // Initial satisfaction check when cell is revealed or game state changes
            if (gameInitialized && cellState.revealed)
                checkSatisfaction();
        }, [cellState.revealed, cellState.value, cellState.flagged, gameInitialized]);

        const handleClick = () => { if (!isFiller && (cellState.revealed || !cellState.flagged)) onCellClick(x, y); };
        
        const handleRightClick = (e: React.MouseEvent) =>
        {
            e.preventDefault();
            if (!isFiller && !cellState.revealed) onCellFlag(x, y);
        };

        const cellType = satisfied ? "satisfied" : boardUtils.getCellType(isFiller, cellState.flagged, cellState.revealed, cellState.value);
        const textColor = boardUtils.getCellTextColor(cellState.revealed, isFiller, cellState.value, satisfied);
        const cellContent = boardUtils.getCellContent(cellState.flagged, cellState.revealed, isFiller, cellState.value);
        const isLight = (x + y) % 2 === 0;

        const Tag = isFiller ? "div" : "button";
        return (
            <Tag className={`cell ${cellType} ${isLight ? "cell-light" : "cell-dark"} flex items-center justify-center text-xs font-bold`}
                 style={textColor ? { color: textColor } : undefined}
                 data-pos={isFiller ? undefined : `${x}-${y}`}
                 data-value={isFiller ? undefined : cellState.value}
                 onClick={handleClick} onContextMenu={handleRightClick}>
                {cellContent}
            </Tag>
        );
    }
);

export default Board;





