import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { themeChange } from 'theme-change'


function App() 
{   // Main application component with theme switching functionality
    
    useEffect(() => 
    {   // Initialize theme change functionality
        themeChange(false)
    }, [])

    return (
        <div className='w-full h-screen bg-base-100 text-base-content p-4'>
            <h1 className='text-2xl font-bold mb-4'>Minesweeper</h1>
            <p className='mb-4'>Welcome to Minesweeper!</p>
            
            <div className='mb-4'>
                <label className='block text-sm font-medium mb-2'>Choose Theme:</label>
                <select data-choose-theme className='select select-bordered w-full max-w-xs'>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
            </div>
        </div>
    )
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
)
