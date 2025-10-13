import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import QuizEditor from './components/QuizEditor';
import QuizPlayer from './components/QuizPlayer';
import QuizDisplay from './pages/QuizDisplay';

// Import background videos from src/assets so Vite bundles them
import bg1 from './assets/background1.mp4';
import bg2 from './assets/background2.mp4';
import bg3 from './assets/background3.mp4';
import bg4 from './assets/background4.mp4';

const questionBackgrounds = [bg1, bg2, bg3, bg4];

export default function App() {
  const [quiz, setQuiz] = useState({ questions: [] });
  const videoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const addQuestion = (q) => {
    setQuiz((prev) => ({ questions: [...prev.questions, q] }));
  };

  return (
    <Routes>
      {/* Home: editor + a button to open the quiz display page */}
      <Route
        path="/"
        element={
          <div className="container">
            <QuizEditor quiz={quiz} addQuestion={addQuestion} />
            <hr style={{ margin: '20px 0', borderColor: 'rgba(255,255,255,0.08)' }} />
            <div style={{ padding: 20 }}>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!quiz.questions.length) {
                    alert('Add questions first');
                    return;
                  }
                  navigate('/quiz');
                }}
              >
                Open Quiz Display (full screen)
              </button>
            </div>
          </div>
        }
      />

      {/* Quiz display page: renders video background + QuizPlayer on top */}
      <Route
        path="/quiz"
        element={
          <QuizDisplay
            quiz={quiz}
            questionBackgrounds={questionBackgrounds}
          />
        }
      />
    </Routes>
  );
}
