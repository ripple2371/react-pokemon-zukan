import React from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import PokemonList from './pages/PokemonList';
import PokemonDetail from './pages/PokemonDetail';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <Navigation />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<PokemonList />} />
          <Route path="/pokemon/:id" element={<PokemonDetail />} />
          <Route path="*" element={
            <div className="p-4 md:p-6 max-w-7xl mx-auto break-words">
              <h2 className="text-xl">ページが見つかりません。</h2>
              <Link to="/" className="mt-3 text-blue-700 underline min-h-11 inline-flex items-center justify-center">一覧に戻る</Link>
            </div>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
