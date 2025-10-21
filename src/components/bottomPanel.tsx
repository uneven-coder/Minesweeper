import { useEffect } from 'react'
import { themeChange } from 'theme-change'
import type { GameStartState } from '../types/board.types'

export const BottomPanel = ({ difficulty, onDifficultyChange, onResetGame }: { difficulty: GameStartState; onDifficultyChange: (difficulty: GameStartState) => void; onResetGame?: () => void }) =>
{   // Bottom panel for theme selection and game controls
    useEffect(() => { themeChange(false) }, [])

    return (
        <div className="w-full h-25 bg-base-200 flex items-center justify-center gap-4 px-4">
            <div>
                <label className='block text-sm font-medium'>Choose Theme:</label>
                <select data-choose-theme className='select select-bordered w-full max-w-xs'>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="color">Color</option>
                </select>
            </div>
            
            <div>
                <label className='block text-sm font-medium'>Difficulty:</label>
                <select value={difficulty} onChange={(e) => onDifficultyChange(e.target.value as GameStartState)}
                        className='select select-bordered w-full max-w-xs'>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>
            
            {onResetGame && <button onClick={onResetGame} className='btn btn-primary'>Reset Game</button>}
        </div>
    )
}

export default BottomPanel