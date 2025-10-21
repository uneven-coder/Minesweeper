import { StrictMode, useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Board from './components/board'
import type { GameStartState, BoardHandle } from './types/board.types'
import BottomPanel from './components/bottomPanel'
import TopPanel from './components/topPanel'

const App = () =>
{
    const [difficulty, setDifficulty] = useState<GameStartState>('easy')
    const boardRef = useRef<BoardHandle>(null)

    const handleResetGame = () => { if (boardRef.current) boardRef.current.resetGame(difficulty); };

    const handleDifficultyChange = (newDifficulty: GameStartState) =>
    {   // Update difficulty and board component
        setDifficulty(newDifficulty);
        if (boardRef.current) boardRef.current.changeDifficulty(newDifficulty);
    };

    return (
        <div className="flex flex-col h-screen w-full">
            <TopPanel />
            <Board ref={boardRef} difficulty={difficulty}/>
            <BottomPanel difficulty={difficulty} onDifficultyChange={handleDifficultyChange} onResetGame={handleResetGame} />
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
// let mobile hold to right click
// style top and bottom bar
// grey out numbers that are stasified already