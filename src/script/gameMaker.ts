import { getSafeCells, areEmptyCellsConnected, doMinesHaveEdgePath } from "../script/floodfill"
import type { CellHandler, GameStartState } from "../types/board.types"
import { difficultySettings } from "../types/board.types"


const MAX_GENERATION_ATTEMPTS = 50;
const EDGE_MINE_RATIO = 0.3;
const DEBUG_LOG_INTERVAL = 10;
const ADJACENT_DIRECTIONS: Array<[number, number]> = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];

let GameGrid: Array<Array<number | string>> = [[]];


function getValueAt(x: number, y: number): number | string | null
{   // Get cell value with bounds checking
    return (y < 0 || y >= GameGrid.length || x < 0 || x >= GameGrid[0].length) ? null : GameGrid[y][x];
}

function countAdjacentMines(x: number, y: number): number 
{   // Count adjacent mines around a cell using direction offsets
    return ADJACENT_DIRECTIONS.reduce((count, [dx, dy]) => 
        count + (getValueAt(x + dx, y + dy) === "M" ? 1 : 0), 0);
}

function generateValidBoard(settings: { width: number, height: number, mines: number }, reservedCells: Set<string>, startX: number, startY: number): { grid: Array<Array<number | string>>, success: boolean }
{   // Generate board with validation using limited attempts
    // Categorizes positions and places mines strategically
    let attempts = 0;

    while (attempts < MAX_GENERATION_ATTEMPTS)
    {
        attempts++;
        const grid = Array.from({ length: settings.height }, () => Array(settings.width).fill(0));
        const placedMines = new Set<string>();

        const edgePositions: Array<[number, number]> = [];
        const centerPositions: Array<[number, number]> = [];

        for (let y = 0; y < settings.height; y++)
            for (let x = 0; x < settings.width; x++)
            {
                const key = `${x},${y}`;
                if (reservedCells.has(key) || (x === startX && y === startY)) continue;

                const isEdge = x === 0 || x === settings.width - 1 || y === 0 || y === settings.height - 1;
                (isEdge ? edgePositions : centerPositions).push([x, y]);
            }

        const edgeMineCount = Math.min(Math.floor(settings.mines * EDGE_MINE_RATIO), edgePositions.length);
        for (let i = 0; i < edgeMineCount && edgePositions.length && placedMines.size < settings.mines; i++)
        {
            const randomIndex = Math.floor(Math.random() * edgePositions.length);
            const [x, y] = edgePositions.splice(randomIndex, 1)[0];
            placedMines.add(`${x},${y}`);
            grid[y][x] = "M";
        }

        const allPositions = [...edgePositions, ...centerPositions];
        while (placedMines.size < settings.mines && allPositions.length)
        {
            const randomIndex = Math.floor(Math.random() * allPositions.length);
            const [x, y] = allPositions.splice(randomIndex, 1)[0];
            placedMines.add(`${x},${y}`);
            grid[y][x] = "M";
        }

        const hasEncasedMine = Array.from(placedMines).some(mine =>
        {
            const [x, y] = mine.split(',').map(Number);
            return countAdjacentMines(x, y) === 8;
        });

        if (!hasEncasedMine)
        {
            const emptyCellsConnected = areEmptyCellsConnected(grid, settings.width, settings.height);
            const minesHaveEdgePath = doMinesHaveEdgePath(grid, settings.width, settings.height);

            if (emptyCellsConnected && minesHaveEdgePath)
                return { grid, success: true };
        }

        if (attempts % DEBUG_LOG_INTERVAL === 0)
            console.debug(`Board generation attempt ${attempts}, retrying...`);
    }

    return { grid: Array.from({ length: settings.height }, () => Array(settings.width).fill(0)), success: false };
}

export function GenerateGameState(cellsRefs: Map<string, CellHandler>, difficulty: GameStartState = "easy", startX?: number, startY?: number): void
{   // Generate game state with mine placement and validation
    // Ensures playable board with connected empty cells and edge-accessible mines

    const settings = difficultySettings[difficulty];
    const finalStartX = startX ?? Math.floor(settings.width / 2);
    const finalStartY = startY ?? Math.floor(settings.height / 2);
    const reservedCells = getSafeCells(finalStartX, finalStartY, settings.width, settings.height, settings.width * settings.height);

    const { grid, success } = generateValidBoard(settings, reservedCells, finalStartX, finalStartY);
    
    if (!success)
    {   // Generate simple fallback board without strict validation
        console.warn("Could not generate valid board within attempt limit, using fallback");
        
        GameGrid = Array.from({ length: settings.height }, () => Array(settings.width).fill(0));
        const placedMines = new Set<string>();

        while (placedMines.size < settings.mines)
        {
            const x = Math.floor(Math.random() * settings.width);
            const y = Math.floor(Math.random() * settings.height);
            const mineKey = `${x},${y}`;

            if (!reservedCells.has(mineKey) && (x !== finalStartX || y !== finalStartY) && !placedMines.has(mineKey))
            {
                placedMines.add(mineKey);
                GameGrid[y][x] = "M";
            }
        }
    }
    else
        GameGrid = grid;

    for (let y = 0; y < settings.height; y++)
        for (let x = 0; x < settings.width; x++)
        {
            const cellRef = cellsRefs.get(`${x}-${y}`);
            if (!cellRef) continue;

            if (getValueAt(x, y) === "M") 
                cellRef.setValue("M");
            else
            {
                const adjMines = countAdjacentMines(x, y);
                GameGrid[y][x] = adjMines;
                cellRef.setValue(`${adjMines}`);
            }
        }
}
