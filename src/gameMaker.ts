// import { debug } from "console";

interface BoardRef {
	getCellRef: (
		x: number,
		y: number
	) => { TESTsetValue: (value: string) => void } | null;
}

const difficultySettings = {
	easy: { width: 16, height: 16, mines: 40 },
	medium: { width: 20, height: 16, mines: 70 },
	hard: { width: 28, height: 16, mines: 140 },
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
	difficulty: keyof typeof difficultySettings = "easy"
) {
	// Generate game state and set test values for all cells

	if (!boardRef) return {};

	const settings = difficultySettings[difficulty];

	// Initialize board - height then width
	GameGrid = Array.from({ length: settings.height }, () =>
		Array(settings.width).fill(0)
	);

	let hasEncasedMine = true;
	while (hasEncasedMine) {
		// Keep regenerating until no mines are completely surrounded
		// Place mines without duplicates
		const placedMines = new Set<string>();
		GameGrid = Array.from({ length: settings.height }, () =>
			Array(settings.width).fill(0)
		);

		while (placedMines.size < settings.mines) {
			// Continue placing mines until we have the required number
			const X = Math.floor(Math.random() * settings.width);
			const Y = Math.floor(Math.random() * settings.height);
			const mineKey = `${X},${Y}`;

			if (!placedMines.has(mineKey)) {
				// Place mine if position is not already occupied
				placedMines.add(mineKey);
				GameGrid[Y][X] = "M";
			}
		}

		// Validate mine positions - check if any mine has 8 adjacent mines
		hasEncasedMine = false;
		placedMines.forEach(mine => {
			// Check each mine for complete encasement
			const [x, y] = mine.split(',').map(Number);
			const adjMines = checkAdj(x, y);
			
			if (adjMines === 8) {
				// Mine is completely surrounded
				console.debug("Encased mine detected, regenerating board");
				hasEncasedMine = true;
			}
		});
	}

	// Calculate numbers and set cell values
	for (let y = 0; y < settings.height; y++) {
		// Process each row of the game board
		for (let x = 0; x < settings.width; x++) {
			// Set each cell value based on mines or adjacent count
			const cellRef = boardRef.getCellRef(x, y);
			if (!cellRef) return;

			if (GetValueAt(x, y) === "M")
				cellRef.TESTsetValue("M");
			else {
				// Calculate adjacent mines for number cells
				const adjMines = checkAdj(x, y)
				GameGrid[y][x] = adjMines;
				cellRef.TESTsetValue(`${adjMines}`);
			}
		}
	}

	return {};
}
