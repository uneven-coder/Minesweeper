// import { debug } from "console";
import {getSafeCells, areEmptyCellsConnected, doMinesHaveEdgePath} from "./floodfill"

interface BoardRef {
	getCellRef: (
		x: number,
		y: number
	) => { 
        setValue: (value: string) => void;
        revealCell?: () => void;
        getValue?: () => string;
        isRevealed?: () => boolean;
        resetCell?: () => void;
    } | null;
}

const difficultySettings = {
	easy: { width: 16, height: 16, mines: 40 },
	medium: { width: 20, height: 16, mines: 56 },
	hard: { width: 28, height: 16, mines: 100 },
} as const;

let GameGrid: Array<Array<number | string>> = [[]];

function GetValueAt(x: number, y: number): number | string | null {
	// Get cell value with bounds checking
	if (y < 0 || y >= GameGrid.length || x < 0 || x >= GameGrid[0].length)
		return null;

	return GameGrid[y][x];
}

function checkAdj(x: number, y: number) {
	let adjMines = 0;
	const dir = [
		[0, 1],
		[1, 1],
		[1, 0],
		[1, -1],
		[0, -1],
		[-1, -1],
		[-1, 0],
		[-1, 1],
	];

	for (const [dx, dy] of dir) {
		// Check each adjacent cell for mines
		if (GetValueAt(x + dx, y + dy) == "M") adjMines++;
	}
	return adjMines;
}

export function GenerateGameState(
	boardRef?: BoardRef,
	difficulty: keyof typeof difficultySettings = "easy",
	startX?: number,
	startY?: number,
)
{   // Generate game state

	if (!boardRef) return {};

	const settings = difficultySettings[difficulty];

	GameGrid = Array.from({ length: settings.height }, () =>
		Array(settings.width).fill(0)
	);

    if (startX === undefined || startY === undefined) {
        startX = Math.floor(settings.width / 2);
        startY = Math.floor(settings.height / 2);
    }

    const reservedCells = getSafeCells(startX, startY, settings.width, settings.height, settings.width * settings.height);

	let validBoard = false;
	let attempts = 0;
	const maxAttempts = 50;

	while (!validBoard && attempts < maxAttempts)
	{   // Generate boards with limited attempts and progressive validation
        // Only check connectivity after basic mine placement succeeds
		attempts++;
		const placedMines = new Set<string>();
		GameGrid = Array.from({ length: settings.height }, () =>
			Array(settings.width).fill(0)
		);

		// Strategic mine placement to avoid common invalid patterns
		const edgePositions = [];
		const centerPositions = [];

		for (let y = 0; y < settings.height; y++)
		{
			for (let x = 0; x < settings.width; x++)
			{
				const key = `${x},${y}`;
				if (reservedCells.has(key) || (x === startX && y === startY)) continue;

				if (x === 0 || x === settings.width - 1 || y === 0 || y === settings.height - 1)
					edgePositions.push([x, y]);
				else
					centerPositions.push([x, y]);
			}
		}

		// Place some mines on edges first for better connectivity
		const edgeMines = Math.min(Math.floor(settings.mines * 0.3), edgePositions.length);
		for (let i = 0; i < edgeMines && placedMines.size < settings.mines; i++)
		{
			const randomIndex = Math.floor(Math.random() * edgePositions.length);
			const [x, y] = edgePositions.splice(randomIndex, 1)[0];
			const mineKey = `${x},${y}`;
			placedMines.add(mineKey);
			GameGrid[y][x] = "M";
		}

		// Fill remaining with random placement
		const allPositions = [...edgePositions, ...centerPositions];
		while (placedMines.size < settings.mines && allPositions.length)
		{
			const randomIndex = Math.floor(Math.random() * allPositions.length);
			const [x, y] = allPositions.splice(randomIndex, 1)[0];
			const mineKey = `${x},${y}`;
			placedMines.add(mineKey);
			GameGrid[y][x] = "M";
		}

		// Quick validation first - check for encased mines
		let hasEncasedMine = false;
		for (const mine of placedMines)
		{
			const [x, y] = mine.split(',').map(Number);
			if (checkAdj(x, y) === 8) {
				hasEncasedMine = true;
				break;
			}
		}

		// Only do expensive connectivity checks if basic validation passes
		if (!hasEncasedMine)
		{
			const emptyCellsConnected = areEmptyCellsConnected(GameGrid, settings.width, settings.height);
			const minesHaveEdgePath = doMinesHaveEdgePath(GameGrid, settings.width, settings.height);
			
			if (emptyCellsConnected && minesHaveEdgePath)
				validBoard = true;
		}

		if (!validBoard && attempts % 10 === 0)
			console.debug(`Board generation attempt ${attempts}, retrying...`);
	}

	if (!validBoard) {
		console.warn("Could not generate valid board within attempt limit, using fallback");
		// Generate simple fallback board without strict validation
		GameGrid = Array.from({ length: settings.height }, () =>
			Array(settings.width).fill(0)
		);
		
		const placedMines = new Set<string>();
		while (placedMines.size < settings.mines)
		{
			const x = Math.floor(Math.random() * settings.width);
			const y = Math.floor(Math.random() * settings.height);
			const mineKey = `${x},${y}`;

			if (!reservedCells.has(mineKey) && (x !== startX || y !== startY) && !placedMines.has(mineKey)) {
				placedMines.add(mineKey);
				GameGrid[y][x] = "M";
			}
		}
	}

	// Calculate numbers and set cell
	for (let y = 0; y < settings.height; y++)
	{   // Process each row
		for (let x = 0; x < settings.width; x++)
		{
			const cellRef = boardRef.getCellRef(x, y);
			if (!cellRef) continue;

			if (GetValueAt(x, y) === "M")
				cellRef.setValue("M");
			else
			{   // Calculate adjacent mines
				const adjMines = checkAdj(x, y);
				GameGrid[y][x] = adjMines;
				cellRef.setValue(`${adjMines}`);
			}
		}
	}

	return {};
}
