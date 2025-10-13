import React, { useState } from 'react';

function fileToDataURL(file) {
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function QuizEditor({ quiz, addQuestion }) {
  const [questionText, setQuestionText] = useState('');
  const [format, setFormat] = useState('text');
  const [options, setOptions] = useState(Array.from({length:4}, ()=>({id: Math.random().toString(36).substr(2, 9), text:'',image:null})));
  const [multipleImages, setMultipleImages] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState(1); // 1-based index for correct option

  const updateOption = (idx, patch) => {
    setOptions(o => o.map((it,i)=> i===idx ? {...it,...patch} : it));
  };

  const handleAdd = async () => {
    if (!questionText.trim()) { alert('Question required'); return; }

    // generate stable unique id (use crypto.randomUUID when available)
    const uid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

    const q = { 
      id: uid,                      // <- added unique id
      questionText, 
      answerFormat: format, 
      options: [], 
      correctAnswer: Number(correctAnswer) || 1, // ensure numeric 1-based index
      explanation: '' 
    };

    if(format === 'multiple-images') {
      if(multipleImages.length !== 4){ alert('Select 4 images'); return; }
      for (let i=0;i<4;i++) {
        q.options.push({ text:'', image: await fileToDataURL(multipleImages[i]) });
      }
    } else {
      for (let i=0;i<4;i++){
        const img = options[i].image ? await fileToDataURL(options[i].image) : null;
        q.options.push({ text: options[i].text || '', image: img });
      }
    }

    console.log('Adding question object:', q); // <-- add this debug log
    addQuestion(q);
    setQuestionText('');
    setOptions(Array.from({length:4}, ()=>({id: Math.random().toString(36).substr(2, 9), text:'',image:null})));
    setMultipleImages([]);
    alert('Question added');
  };

  return (
    <section className="setup-section">
      <h1>🎯 Animated Quiz Creator (React)</h1>
      <div className="form-group">
        <label htmlFor="questionText">Question</label>
        <textarea id="questionText" value={questionText} onChange={e=>setQuestionText(e.target.value)} rows={3} />
      </div>

      <div className="form-group">
        <label htmlFor="format-text">Answer Format</label>
        <div className="radio-group">
          <label className="radio-label">
            <input id="format-text" type="radio" name="format" checked={format==='text'} onChange={()=>setFormat('text')} /> <span>Text</span>
          </label>
          <label className="radio-label">
            <input type="radio" name="format" checked={format==='image'} onChange={()=>setFormat('image')} /> <span>Image</span>
          </label>
          <label className="radio-label">
            <input type="radio" name="format" checked={format==='both'} onChange={()=>setFormat('both')} /> <span>Both</span>
          </label>
          <label className="radio-label">
            <input type="radio" name="format" checked={format==='multiple-images'} onChange={()=>setFormat('multiple-images')} /> <span>Multiple Images</span>
          </label>
        </div>
      </div>

      {format === 'multiple-images' ? (
        <div className="multiple-images-input">
          <label htmlFor="multipleImagesInput">Select 4 images</label>
          <input id="multipleImagesInput" type="file" multiple accept="image/*" onChange={e=>setMultipleImages(Array.from(e.target.files))} />
        </div>
      ) : (
        <div className="options-container">
          {options.map((opt, i)=>(
            <div key={opt.id} className="option-input">
              {(format==='text' || format==='both') && <input id={`option${i+1}`} placeholder={`Option ${i+1} text`} value={opt.text} onChange={e=>updateOption(i,{text:e.target.value})} />}
              {(format==='image' || format==='both') && <input id={`optionImage${i+1}`} type="file" accept="image/*" onChange={e=>updateOption(i,{image: e.target.files[0]})} />}
            </div>
          ))}
        </div>
      )}

      {/* Correct answer selector (keeps editor HTML explicit) */}
      <div className="form-group">
        <label htmlFor="correctAnswer">Correct answer</label>
        <select
          id="correctAnswer"
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(Number(e.target.value))}
        >
          {options.map((opt, i) => (
            <option key={opt.id || i} value={i + 1}>{`Option ${i + 1}`}</option>
          ))}
        </select>
      </div>

      <div style={{marginTop:12}}>
        <button type="button" className="btn-primary" onClick={handleAdd}>Add to Quiz</button>
      </div>

      <div className="added-questions" style={{display: quiz.questions.length ? 'block':'none', marginTop:20}}>
        <h3>Added Questions</h3>
        <ul>
          {quiz.questions.map((q) => (
            <li key={q.id /* use stable unique id instead of question text or index */}>
              {q.questionText}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}