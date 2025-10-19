import { StrictMode, useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Board, { BoardHandle } from './board'
import BottomPanel from './bottomPanel'
import TopPanel from './topPanel'

function App()
{   // Main application component with game state management
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
    const boardRef = useRef<BoardHandle>(null)

    const handleResetGame = () =>
    {   // Reset the current game board
        if (boardRef.current)
            boardRef.current.resetGame(difficulty);
    };

    const handleDifficultyChange = (newDifficulty: 'easy' | 'medium' | 'hard') =>
    {
        setDifficulty(newDifficulty);
        if (boardRef.current)
            boardRef.current.changeDifficulty(newDifficulty);
    };

    return (
        <div className="flex flex-col h-screen w-full">
            <TopPanel />
            <Board ref={boardRef} difficulty={difficulty}/>
            <BottomPanel 
                difficulty={difficulty} 
                onDifficultyChange={handleDifficultyChange}
                onResetGame={handleResetGame}
            />
        </div>
    )
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
)

// add timer
// add avalible flags counter