interface CellRef {
    revealCell?: () => void;
    getValue?: () => string;
    isRevealed?: () => boolean;
    resetCell?: () => void;
    isFlagged?: () => boolean;
}

interface BoardRef {
    getCellRef: (x: number, y: number) => CellRef | null;
}

export function revealConnectedCells(startX: number, startY: number, boardRef: BoardRef, width: number, height: number): void
{   // Floodfill algorithm to reveal connected empty cells and adjacent numbered cells
    // Uses BFS to reveal all connected empty areas and their numbered boundaries
    
    const visited = new Set<string>();
    const queue = [[startX, startY]];
    const directions = [
        [0, 1], [1, 1], [1, 0], [1, -1],
        [0, -1], [-1, -1], [-1, 0], [-1, 1]
    ];

    while (queue.length > 0)
    {   // Process each position in the floodfill queue
        const [currentX, currentY] = queue.shift()!;
        const currentKey = `${currentX},${currentY}`;

        if (visited.has(currentKey) || currentX < 0 || currentX >= width || currentY < 0 || currentY >= height)
            continue;

        visited.add(currentKey);

        const currentCell = boardRef.getCellRef(currentX, currentY);
        if (!currentCell || currentCell.isRevealed?.() || currentCell.isFlagged?.())
            continue;

        currentCell.revealCell?.();
        const cellValue = currentCell.getValue?.();

        if (cellValue === "0")
        {   // Add all adjacent cells to queue for empty cells
            directions.forEach(([dx, dy]) => {
                const nx = currentX + dx;
                const ny = currentY + dy;
                const adjacentKey = `${nx},${ny}`;

                if (!visited.has(adjacentKey))
                    queue.push([nx, ny]);
            });
        }
    }
}

export function getSafeCells(startX: number, startY: number, width: number, height: number, totalCells: number): Set<string>
{   // Generate safe cells with reduced target for faster generation
    // Smaller safe areas reduce constraints on mine placement
    
    const safeCells = new Set<string>();
    const targetSafeCount = Math.min(Math.floor(totalCells * 0.08), 20);
    const queue = [[startX, startY]];
    safeCells.add(`${startX},${startY}`);

    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    while (queue.length && safeCells.size < targetSafeCount)
    {   // Continue floodfill until target safe count reached
        const [x, y] = queue.shift()!;
        
        for (const [dx, dy] of directions)
        {   // Check each direction from current position
            const nx = x + dx, ny = y + dy;
            const key = `${nx},${ny}`;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !safeCells.has(key))
            {   // Add valid cell to safe area
                safeCells.add(key);
                queue.push([nx, ny]);
                
                if (safeCells.size >= targetSafeCount) break;
            }
        }
    }

    return safeCells;
}

export function areEmptyCellsConnected(grid: Array<Array<number | string>>, width: number, height: number): boolean
{   // Fast connectivity check with early termination optimization
    // Count empty cells first to avoid unnecessary floodfill
    
    let totalEmptyCells = 0;
    for (let y = 0; y < height; y++)
    {
        for (let x = 0; x < width; x++)
        {
            if (grid[y][x] !== "M")
                totalEmptyCells++;
        }
    }
    
    if (totalEmptyCells === 0) return true;

    let startX = -1, startY = -1;
    outerLoop: for (let y = 0; y < height; y++)
    {
        for (let x = 0; x < width; x++)
        {
            if (grid[y][x] !== "M") {
                startX = x;
                startY = y;
                break outerLoop;
            }
        }
    }

    if (startX === -1) return false;

    const visited = new Set<string>();
    const queue = [[startX, startY]];
    visited.add(`${startX},${startY}`);
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    while (queue.length && visited.size < totalEmptyCells)
    {   // Process connected cells until all found or queue exhausted
        const [x, y] = queue.shift()!;
        
        for (const [dx, dy] of directions)
        {
            const nx = x + dx, ny = y + dy;
            const key = `${nx},${ny}`;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
                !visited.has(key) && grid[ny][nx] !== "M")
            {
                visited.add(key);
                queue.push([nx, ny]);
                if (visited.size >= totalEmptyCells) return true;
            }
        }
    }

    return visited.size === totalEmptyCells;
}

export function doMinesHaveEdgePath(grid: Array<Array<number | string>>, width: number, height: number): boolean
{   // Simplified mine connectivity check with relaxed requirements
    // Allow more mine configurations to pass validation
    
    const minePositions: string[] = [];
    for (let y = 0; y < height; y++)
    {
        for (let x = 0; x < width; x++)
        {
            if (grid[y][x] === "M")
                minePositions.push(`${x},${y}`);
        }
    }

    if (minePositions.length === 0) return true;

    const edgeMines = minePositions.filter((mine: string) =>
    {
        const [x, y] = mine.split(',').map(Number);
        return x === 0 || x === width - 1 || y === 0 || y === height - 1;
    });

    if (edgeMines.length >= Math.max(1, Math.floor(minePositions.length * 0.15)))
        return true;

    const edgeConnectedMines = new Set(edgeMines);
    const queue = edgeMines.map((mine: string) => mine.split(',').map(Number));
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

    while (queue.length && edgeConnectedMines.size < minePositions.length)
    {
        const [x, y] = queue.shift()!;
        
        for (const [dx, dy] of directions)
        {
            const nx = x + dx, ny = y + dy;
            const key = `${nx},${ny}`;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                minePositions.indexOf(key) !== -1 && !edgeConnectedMines.has(key))
            {
                edgeConnectedMines.add(key);
                queue.push([nx, ny]);
            }
        }
    }

    return edgeConnectedMines.size >= Math.floor(minePositions.length * 0.8);
}

export function triggerFloodFill(x: number, y: number, boardRef: BoardRef, width: number, height: number): void
{   // Trigger flood fill when an empty cell is clicked
    // Check if cell is empty (value "0") before starting flood fill
    
    const cell = boardRef.getCellRef(x, y);
    if (!cell || cell.isRevealed?.()) return;
    
    const cellValue = cell.getValue?.();
    if (cellValue === "0")
        revealConnectedCells(x, y, boardRef, width, height);
}

export function resetBoardState(boardRef: BoardRef, width: number, height: number): void
{   // Reset all cells to hidden state for new game
    // Ensures no cells remain revealed from previous game
    
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            boardRef.getCellRef(x, y)?.resetCell?.();
}
