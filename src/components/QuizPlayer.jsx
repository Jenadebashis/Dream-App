import React, { useState, useRef, useEffect } from 'react';

export default function QuizPlayer({
  quiz = { questions: [] },
  questionBackgrounds = [],
  backgroundVideoRef = { current: null }
}) {
  console.log('QuizPlayer quiz:', quiz);

  // ensure we still render the page so CSS/DOM can be inspected even if no questions
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return (
      <section className="quiz-section">
        <div className="quiz-container" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ color: 'white' }}>No questions yet — add questions above.</div>
        </div>
      </section>
    );
  }

  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (running && quiz.questions.length > 0) setBackgroundForQuestion(index);
  }, [index, running, quiz.questions.length]);

  const setBackgroundForQuestion = (i) => {
    const video = backgroundVideoRef?.current;
    if (!video) return;
    const src = questionBackgrounds[i % questionBackgrounds.length];
    const source = video.querySelector('source');
    if (!source) return;
    if (source.getAttribute('data-current') === src) return;
    source.setAttribute('src', src);
    source.setAttribute('data-current', src);
    video.load();
    video.play().catch(() => {});
  };

  const fileDownload = (blobUrl) => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `quiz-${Date.now()}.webm`;
    a.click();
  };

  const startRecording = async () => {
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      streamRef.current = s;
      mediaRecorderRef.current = new MediaRecorder(s, { mimeType: 'video/webm;codecs=vp9' });
      recordedChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size) recordedChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
      };
      mediaRecorderRef.current.start();
    } catch (err) {
      console.error(err);
      alert('Screen capture permission required to record.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const startQuiz = async () => {
    if (!quiz.questions.length) {
      alert('Add questions first');
      return;
    }
    await startRecording();
    setRunning(true);
    setIndex(0);
    setSelected(null);
    runTimer();
  };

  const runTimer = () => {
    setTimeLeft(10);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          revealResult(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const revealResult = (sel) => {
    setSelected(sel);
    clearInterval(timerRef.current);
    setTimeout(() => {
      if (index + 1 < quiz.questions.length) {
        setIndex((i) => i + 1);
        setSelected(null);
        runTimer();
      } else {
        stopRecording();
        setRunning(false);
      }
    }, 2000);
  };

  const onSelect = (n) => {
    revealResult(n);
  };

  // Safe access to current question and options
  const q = quiz.questions[index] || { id: `q-${index}`, questionText: '', options: [], correctAnswer: 1 };
  const options = Array.isArray(q.options) ? q.options : [];

  console.log('current question', index, q);
  console.log('options length', options.length, options);

  return (
    <section className="quiz-section">
      <div className="quiz-container" style={{ position: 'relative', zIndex: 10 }}>
        <div className="question-display">
          <h2>{q.questionText}</h2>
        </div>

        {/* visible debug if options empty */}
        {options.length === 0 && (
          <div style={{ color: 'white' }}>
            Debug: options is empty — question payload:
            <pre style={{ whiteSpace: 'pre-wrap', color: '#fff' }}>{JSON.stringify(q, null, 2)}</pre>
          </div>
        )}

        <div id="optionsDisplay" className="options-display" style={{ zIndex: 11 }}>
          {options.map((opt, i) => (
            // use stable key combining question id and index
            <div
              key={`${q.id ?? index}-${i}`}
              className={`option-card ${
                selected !== null
                  ? (i + 1) === (q.correctAnswer ?? 1)
                    ? 'correct'
                    : (i + 1) === selected
                    ? 'incorrect'
                    : ''
                  : ''
              }`}
              onClick={() => onSelect(i + 1)}
            >
              <span className="option-number">Option {i + 1}</span>
              {opt.text && <div className="option-text">{opt.text}</div>}
              {opt.image && <img src={opt.image} alt={`opt-${i}`} />}
            </div>
          ))}
        </div>

        <div id="timerSection" className="timer-section" style={{ display: running ? 'block' : 'none' }}>
          <div className="timer-text">Time left: {timeLeft}</div>
        </div>

        <div style={{ marginTop: 16 }}>
          {!running ? (
            <button className="btn-primary" onClick={startQuiz}>Start Quiz & Record 🎥</button>
          ) : (
            <button className="btn-secondary" onClick={() => { stopRecording(); setRunning(false); }}>Stop</button>
          )}
          {recordedUrl && <button className="btn-download" onClick={() => fileDownload(recordedUrl)} style={{ marginLeft: 8 }}>Download</button>}
        </div>
      </div>
    </section>
  );
}