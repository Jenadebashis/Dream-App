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
  const [completed, setCompleted] = useState(false);

  const [transitioning, setTransitioning] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const contentTimeoutRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (running && quiz.questions.length > 0 && !completed) setBackgroundForQuestion(index);
  }, [index, running, quiz.questions.length, completed]);

  // clear timeout on unmount / index change
  useEffect(() => {
    return () => {
      if (contentTimeoutRef.current) {
        clearTimeout(contentTimeoutRef.current);
        contentTimeoutRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // start/stop single interval only when running && content visible
  useEffect(() => {
    if (!running || completed || !showContent) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // start/reset timer for current question
    setTimeLeft(10);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // schedule reveal outside interval callback stack
          setTimeout(() => revealResult(null), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running, index, completed, showContent]);

  const setBackgroundForQuestion = (i) => {
    const video = backgroundVideoRef?.current;
    if (!video || !questionBackgrounds || questionBackgrounds.length === 0) return;
    const src = questionBackgrounds[i % questionBackgrounds.length];
    if (!src) return;
    if (video.datasetCurrent === src) {
      // still ensure content is shown after any existing transition state
      return;
    }

    // start transition: hide content immediately and mark transitioning
    setShowContent(false);
    setTransitioning(true);

    const fadeDuration = 360;
    const onCanPlay = () => {
      video.removeEventListener('canplay', onCanPlay);
      video.play().catch(() => {});
      video.style.opacity = '1';

      // wait 2.5s (2500ms) AFTER video is ready before showing question/options and starting timer
      if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current);
      contentTimeoutRef.current = window.setTimeout(() => {
        setShowContent(true);
        setTransitioning(false);
        contentTimeoutRef.current = null;
      }, 4500);
    };

    // fade out quickly, then swap src
    video.style.transition = `opacity ${fadeDuration}ms ease`;
    video.style.opacity = '0';

    const doSwap = () => {
      video.datasetCurrent = src;
      video.src = src;
      video.load();
      video.addEventListener('canplay', onCanPlay);
    };

    window.setTimeout(doSwap, Math.max(40, fadeDuration - 80));
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
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeLeft(0);
    }
  };

  const startQuiz = async () => {
    if (!quiz.questions.length) {
      alert('Add questions first');
      return;
    }
    if (running) return;

    setIndex(0);
    await startRecording();
    setRunning(true);
    setCompleted(false);
    setSelected(null);
    // showContent will be controlled by setBackgroundForQuestion triggered by the effect
    setShowContent(false);
  };

  const revealResult = (sel) => {
    setSelected(sel);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex < quiz.questions.length) {
        setIndex(nextIndex);
        setSelected(null);
        // background change -> showContent true after delay -> effect starts timer
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stopRecording();
        setRunning(false);
        setCompleted(true);
      }
    }, 1200);
  };

  const onSelect = (n) => {
    if (completed || selected !== null) return;
    revealResult(n);
  };

  const q = quiz.questions[index] || { id: `q-${index}`, questionText: '', options: [], correctAnswer: 1 };
  const options = Array.isArray(q.options) ? q.options : [];

  console.log('current question', index, q);
  console.log('options length', options.length, options);

  return (
    <section className="quiz-section">
      <div className={`quiz-container ${transitioning ? 'transitioning' : ''}`} style={{ position: 'relative', zIndex: 10 }}>
        {(running || completed) && showContent ? (
          <>
            <div className="question-display" key={`q-${index}`}>
              <h2 className="question-text-animated">{q.questionText}</h2>
            </div>

            <div id="optionsDisplay" className="options-display" style={{ zIndex: 11 }}>
              {options.map((opt, i) => (
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
                  style={{ animationDelay: `${i * 450}ms` }} // increased stagger for slower feel
                >
                  <span className="option-number">Option {i + 1}</span>
                  {opt.text && <div className="option-text">{opt.text}</div>}
                  {opt.image && <img src={opt.image} alt={`opt-${i}`} />}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '40px 0', color: '#ddd' }}>
            {transitioning ? 'Transitioning…' : <button className="btn-primary" onClick={startQuiz}>Start Quiz & Record 🎥</button>}
          </div>
        )}

        <div id="timerSection" className="timer-section" style={{ display: (running && showContent) ? 'block' : 'none' }}>
          <div className="timer-text">Time left: {timeLeft}</div>
        </div>

        <div style={{ marginTop: 16 }}>
          {completed ? (
            <div>
              <div style={{ color: 'white', marginBottom: 8 }}>Quiz complete ✅</div>
              {recordedUrl && <button className="btn-download" onClick={() => fileDownload(recordedUrl)} style={{ marginLeft: 8 }}>Download</button>}
              <button className="btn-secondary" style={{ marginLeft: 8 }} onClick={() => { setCompleted(false); setIndex(0); setRecordedUrl(null); }}>Restart</button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}