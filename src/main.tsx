import { StrictMode, useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Board from './board'
import BottomPanel from './bottomPanel'
import TopPanel from './topPanel'

function App()
{   // Main application component with game state management
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
    const boardRef = useRef<{ resetGame: (difficulty: 'easy' | 'medium' | 'hard') => void }>(null)

    const handleResetGame = () => {
        boardRef.current?.resetGame(difficulty)
    }

    return (
        <div className="flex flex-col h-screen w-full">
            <TopPanel />
            <Board ref={boardRef} difficulty={difficulty}/>
            <BottomPanel 
                difficulty={difficulty} 
                onDifficultyChange={setDifficulty}
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
