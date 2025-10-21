import type { CellHandler, GameGrid, Direction } from "../types/board.types"


const ALL_DIRECTIONS: Direction[] = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
const CARDINAL_DIRECTIONS: Direction[] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const SAFE_CELL_RATIO = 0.08;
const MAX_SAFE_CELLS = 20;
const MIN_EDGE_MINE_RATIO = 0.15;
const MIN_CONNECTED_MINE_RATIO = 0.8;


export function revealConnectedCells(startX: number, startY: number, cellsRefs: Map<string, CellHandler>, width: number, height: number): void
{   // Floodfill algorithm to reveal connected empty cells and adjacent numbered cells
    // Uses BFS to reveal all connected empty areas and their numbered boundaries
    
    const visited = new Set<string>();
    const queue: Array<[number, number]> = [[startX, startY]];

    while (queue.length > 0)
    {
        const [currentX, currentY] = queue.shift()!;
        const currentKey = `${currentX}-${currentY}`;

        if (visited.has(currentKey) || currentX < 0 || currentX >= width || currentY < 0 || currentY >= height)
            continue;

        visited.add(currentKey);

        const currentCell = cellsRefs.get(currentKey);
        if (!currentCell || currentCell.isRevealed() || currentCell.isFlagged())
            continue;

        currentCell.revealCell();
        
        if (currentCell.getValue() === "0")
            ALL_DIRECTIONS.forEach(([dx, dy]) =>
            {
                const adjacentKey = `${currentX + dx}-${currentY + dy}`;
                if (!visited.has(adjacentKey))
                    queue.push([currentX + dx, currentY + dy]);
            });
    }
}

export function getSafeCells(startX: number, startY: number, width: number, height: number, totalCells: number): Set<string>
{   // Generate safe cells with reduced target for faster generation
    // Smaller safe areas reduce constraints on mine placement
    
    const safeCells = new Set<string>();
    const targetSafeCount = Math.min(Math.floor(totalCells * SAFE_CELL_RATIO), MAX_SAFE_CELLS);
    const queue: Array<[number, number]> = [[startX, startY]];
    
    safeCells.add(`${startX},${startY}`);

    while (queue.length && safeCells.size < targetSafeCount)
    {
        const [x, y] = queue.shift()!;
        
        for (const [dx, dy] of CARDINAL_DIRECTIONS)
        {
            const nx = x + dx;
            const ny = y + dy;
            const key = `${nx},${ny}`;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !safeCells.has(key))
            {
                safeCells.add(key);
                queue.push([nx, ny]);
                
                if (safeCells.size >= targetSafeCount) break;
            }
        }
    }

    return safeCells;
}

export function areEmptyCellsConnected(grid: GameGrid, width: number, height: number): boolean
{   // Fast connectivity check with early termination optimization
    // Count empty cells first to avoid unnecessary floodfill
    
    let totalEmptyCells = 0;
    let startX = -1;
    let startY = -1;

    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            if (grid[y][x] !== "M")
            {
                totalEmptyCells++;
                if (startX === -1) { startX = x; startY = y; }
            }
    
    if (totalEmptyCells === 0) return true;
    if (startX === -1) return false;

    const visited = new Set<string>();
    const queue: Array<[number, number]> = [[startX, startY]];
    visited.add(`${startX},${startY}`);

    while (queue.length && visited.size < totalEmptyCells)
    {
        const [x, y] = queue.shift()!;
        
        for (const [dx, dy] of CARDINAL_DIRECTIONS)
        {
            const nx = x + dx;
            const ny = y + dy;
            const key = `${nx},${ny}`;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited.has(key) && grid[ny][nx] !== "M")
            {
                visited.add(key);
                queue.push([nx, ny]);
                
                if (visited.size >= totalEmptyCells) return true;
            }
        }
    }

    return visited.size === totalEmptyCells;
}

export function doMinesHaveEdgePath(grid: GameGrid, width: number, height: number): boolean
{   // Simplified mine connectivity check with relaxed requirements
    // Allow more mine configurations to pass validation
    
    const minePositions: string[] = [];
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            if (grid[y][x] === "M") 
                minePositions.push(`${x},${y}`);
    
    if (minePositions.length === 0) return true;

    const edgeMines = minePositions.filter(mine =>
    {
        const [x, y] = mine.split(',').map(Number);
        return x === 0 || x === width - 1 || y === 0 || y === height - 1;
    });

    const minEdgeMines = Math.max(1, Math.floor(minePositions.length * MIN_EDGE_MINE_RATIO));
    if (edgeMines.length >= minEdgeMines) return true;

    const edgeConnectedMines = new Set(edgeMines);
    const queue = edgeMines.map(mine => mine.split(',').map(Number));

    while (queue.length && edgeConnectedMines.size < minePositions.length)
    {
        const [x, y] = queue.shift()!;
        
        for (const [dx, dy] of ALL_DIRECTIONS)
        {
            const nx = x + dx;
            const ny = y + dy;
            const key = `${nx},${ny}`;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
                minePositions.indexOf(key) !== -1 && 
                !edgeConnectedMines.has(key))
            {
                edgeConnectedMines.add(key);
                queue.push([nx, ny]);
            }
        }
    }

    const minConnected = Math.floor(minePositions.length * MIN_CONNECTED_MINE_RATIO);
    return edgeConnectedMines.size >= minConnected;
}
