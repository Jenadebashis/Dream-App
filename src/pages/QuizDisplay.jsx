import React, { useRef, useEffect } from 'react';
import QuizPlayer from '../components/QuizPlayer';
import { useNavigate } from 'react-router-dom';

export default function QuizDisplay({ quiz = { questions: [] }, questionBackgrounds = [] }) {
  const videoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      // use direct play and ignore rejection
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // If no questions, send user back
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    // small delay to allow alert -> navigate
    setTimeout(() => navigate('/'), 10);
    return (
      <div style={{ padding: 20, color: 'white' }}>
        No questions — redirecting to editor...
      </div>
    );
  }

  return (
    <div>
      <video
        id="backgroundVideo"
        ref={videoRef}
        src={questionBackgrounds[0] || ''}
        autoPlay
        loop
        muted
        playsInline
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}
      />
      <QuizPlayer
        quiz={quiz}
        questionBackgrounds={questionBackgrounds}
        backgroundVideoRef={videoRef}
      />
    </div>
  );
}