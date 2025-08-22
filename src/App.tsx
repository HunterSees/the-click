import { GameProvider, useGameContext } from './contexts/GameContext';
import Header from './components/Header';
import Grid from './components/Grid';
import JackpotDisplay from './components/JackpotDisplay';

// Define MainApp component to consume the context
function MainApp() {
  const { devMode } = useGameContext();

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <JackpotDisplay />
        
        {/* Grid is always enabled now, it will handle its own state */}
        <Grid />

        {/* Developer mode indicator */}
        {devMode && (
          <div className="mt-4 bg-[#222222] p-3 rounded-lg text-sm">
            <span className="text-[#FF0000] font-bold">DEV MODE ACTIVE</span>
          </div>
        )}
      </main>
      <footer className="py-4 text-center flex flex-col items-center justify-center">
        <p className="text-[#FF0000] text-xl">www.theclick.game</p>
        <p className="text-white text-xs">© HunterSees 2025 All rights reserved.</p>
      </footer>
    </div>
  );
}

// App component now just sets up the provider and renders MainApp
function App() {
  return (
    <GameProvider>
      <MainApp />
    </GameProvider>
  );
}

export default App;