// Global variables
let mediaRecorder;
let recordedChunks = [];
let quizData = { questions: [] };
let timerInterval;
let timeRemaining = 10;
let stream;
let currentQuestionIndex = 0;
let selectedAnswer = null;

// DOM Elements
const quizForm = document.getElementById('quizForm');
const setupSection = document.getElementById('setupSection');
const quizSection = document.getElementById('quizSection');
const answerFormatRadios = document.querySelectorAll('input[name="answerFormat"]');

const questionBackgrounds = [
    'background1.mp4',
    'background2.mp4',
    'background3.mp4',
    'background4.mp4'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // Answer format change
    answerFormatRadios.forEach(radio => {
        radio.addEventListener('change', handleAnswerFormatChange);
    });

    // Add question button
    document.getElementById('addQuestionBtn').addEventListener('click', handleAddQuestion);

    // Start quiz button
    document.getElementById('startQuizBtn').addEventListener('click', startQuiz);

    // Restart button
    document.getElementById('restartBtn').addEventListener('click', restartQuiz);
}

function handleAnswerFormatChange(e) {
    const format = e.target.value;
    const textInputs = document.querySelectorAll('.option-input input[type="text"]');
    const imageInputs = document.querySelectorAll('.option-input input[type="file"]');
    const multipleImagesInput = document.querySelector('.multiple-images-input');
    const optionsContainer = document.querySelector('.options-container');

    if (format === 'text') {
        textInputs.forEach(input => {
            input.style.display = 'block';
            input.required = true;
        });
        imageInputs.forEach(input => {
            input.style.display = 'none';
            input.required = false;
        });
        multipleImagesInput.style.display = 'none';
        optionsContainer.style.display = 'block';
    } else if (format === 'image') {
        textInputs.forEach(input => {
            input.style.display = 'none';
            input.required = false;
        });
        imageInputs.forEach(input => {
            input.style.display = 'block';
            input.required = true;
        });
        multipleImagesInput.style.display = 'none';
        optionsContainer.style.display = 'block';
    } else if (format === 'both') {
        textInputs.forEach(input => {
            input.style.display = 'block';
            input.required = true;
        });
        imageInputs.forEach(input => {
            input.style.display = 'block';
            input.required = true;
        });
        multipleImagesInput.style.display = 'none';
        optionsContainer.style.display = 'block';
    } else if (format === 'multiple-images') {
        textInputs.forEach(input => {
            input.style.display = 'none';
            input.required = false;
        });
        imageInputs.forEach(input => {
            input.style.display = 'none';
            input.required = false;
        });
        multipleImagesInput.style.display = 'block';
        optionsContainer.style.display = 'none';
    }
}

async function handleAddQuestion() {
    const format = document.querySelector('input[name="answerFormat"]:checked').value;

    // Validate based on format
    let isValid = true;
    const errorMessages = [];

    if (format === 'multiple-images') {
        const multipleImages = document.getElementById('multipleImages').files;
        if (multipleImages.length !== 4) {
            isValid = false;
            errorMessages.push('Please select exactly 4 images.');
        }
    } else {
        for (let i = 1; i <= 4; i++) {
            const textInput = document.getElementById(`option${i}`);
            const imageInput = document.getElementById(`optionImage${i}`);

            if ((format === 'text' || format === 'both') && !textInput.value.trim()) {
                isValid = false;
                errorMessages.push(`Option ${i} text is required.`);
            }

            if ((format === 'image' || format === 'both') && !imageInput.files[0]) {
                isValid = false;
                errorMessages.push(`Option ${i} image is required.`);
            }
        }
    }

    if (!document.getElementById('questionText').value.trim()) {
        isValid = false;
        errorMessages.push('Question text is required.');
    }

    if (!isValid) {
        alert('Please fill in all required fields:\n' + errorMessages.join('\n'));
        return;
    }

    // Collect form data
    const question = {
        questionText: document.getElementById('questionText').value,
        answerFormat: format,
        options: [],
        correctAnswer: parseInt(document.getElementById('correctAnswer').value),
        explanation: document.getElementById('answerExplanation').value
    };

    // Get options
    if (format === 'multiple-images') {
        const multipleImages = document.getElementById('multipleImages').files;
        for (let i = 0; i < 4; i++) {
            const imageData = await fileToDataURL(multipleImages[i]);
            question.options.push({
                text: '',
                image: imageData
            });
        }
    } else {
        for (let i = 1; i <= 4; i++) {
            const text = document.getElementById(`option${i}`).value;
            const imageFile = document.getElementById(`optionImage${i}`).files[0];
            let imageData = null;
            
            if (imageFile) {
                imageData = await fileToDataURL(imageFile);
            }

            question.options.push({
                text: text,
                image: imageData
            });
        }
    }

    // Add to quiz
    quizData.questions.push(question);

    // Display in list
    const li = document.createElement('li');
    li.textContent = question.questionText;
    document.getElementById('questionsList').appendChild(li);

    // Show added questions
    document.getElementById('addedQuestions').style.display = 'block';

    // Clear form
    quizForm.reset();

    // Show start quiz button
    document.getElementById('startQuizBtn').style.display = 'block';
}

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function startQuiz() {
    const quizSection = document.getElementById('quizSection');
    const answerFormat = document.querySelector('input[name="answerFormat"]:checked').value;
    
    // Conditionally add the centered class if text only
    if (answerFormat === 'text') {
        quizSection.classList.add('centered');
    } else {
        quizSection.classList.remove('centered');
    }
    
    // Show the quiz section and proceed with your existing logic
    quizSection.style.display = 'block';

    // Hide setup, show quiz
    setupSection.style.display = 'none';
    // quizSection.style.display = 'block';

    // Start recording
    await startRecording();

    // Start with first question
    currentQuestionIndex = 0;
    selectedAnswer = null;

    // Display question
    displayQuestion();

    // Animate options with delay
    setTimeout(() => {
        displayOptions();
    }, 800);

    // Show timer after options are loaded
    setTimeout(() => {
        startTimer();
    }, 3000); // After all options animate in
}

async function startRecording() {
    try {
        // Capture the quiz section
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: { 
                mediaSource: 'screen',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            const downloadBtn = document.getElementById('downloadVideo');
            downloadBtn.style.display = 'block';
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = url;
                a.download = `quiz-${Date.now()}.webm`;
                a.click();
            };
        };

        mediaRecorder.start();
    } catch (error) {
        console.error('Error starting recording:', error);
        alert('Could not start recording. Please make sure you granted screen capture permission.');
    }
}

function setBackgroundForQuestion(index) {
    const video = document.getElementById('backgroundVideo');
    if (!video) return;
    const source = video.querySelector('source');
    if (!source) return;

    const bg = questionBackgrounds[index % questionBackgrounds.length];
    // If already set to this background, do nothing
    if (source.getAttribute('data-current') === bg) return;

    source.setAttribute('src', bg);
    source.setAttribute('data-current', bg);
    // reload the video element so the new source is used
    video.load();
    // try to play (catch promise rejection for autoplay policy)
    video.play().catch(() => {});
}

function displayQuestion() {
    const questionTextElem = document.getElementById('displayQuestionText');
    questionTextElem.textContent = quizData.questions[currentQuestionIndex].questionText;

    // ensure background corresponds to current question
    setBackgroundForQuestion(currentQuestionIndex);
}

function displayOptions() {
    const optionsDisplay = document.getElementById('optionsDisplay');
    optionsDisplay.innerHTML = '';

    const currentQuestion = quizData.questions[currentQuestionIndex];

    currentQuestion.options.forEach((option, index) => {
        const optionCard = document.createElement('div');
        optionCard.className = 'option-card';
        optionCard.dataset.optionNumber = index + 1;

        // Add click listener
        optionCard.addEventListener('click', () => selectOption(index + 1));

        const optionNumber = document.createElement('span');
        optionNumber.className = 'option-number';
        optionNumber.textContent = `Option ${index + 1}`;
        optionCard.appendChild(optionNumber);

        if ((currentQuestion.answerFormat === 'text' || currentQuestion.answerFormat === 'both') && option.text) {
            const optionText = document.createElement('div');
            optionText.className = 'option-text';
            optionText.textContent = option.text;
            optionCard.appendChild(optionText);
        }

        if ((currentQuestion.answerFormat === 'image' || currentQuestion.answerFormat === 'both' || currentQuestion.answerFormat === 'multiple-images') && option.image) {
            const img = document.createElement('img');
            img.src = option.image;
            optionCard.appendChild(img);
        }

        optionsDisplay.appendChild(optionCard);

        // Animate with delay
        setTimeout(() => {
            optionCard.classList.add('animate');
        }, index * 400);
    });
}

function selectOption(optionNum) {
    selectedAnswer = optionNum;
    clearInterval(timerInterval);
    showResult();
}

function startTimer() {
    const timerSection = document.getElementById('timerSection');
    const timerDisplay = document.getElementById('timerDisplay');
    const timerBar = document.getElementById('timerBar');

    timerSection.style.display = 'block';
    timeRemaining = 10;

    timerInterval = setInterval(() => {
        timeRemaining--;
        timerDisplay.textContent = timeRemaining;
        
        // Update timer bar
        const percentage = (timeRemaining / 10) * 100;
        timerBar.style.width = percentage + '%';

        // Change color based on time
        if (timeRemaining <= 3) {
            timerBar.classList.add('danger');
            timerBar.classList.remove('warning');
        } else if (timeRemaining <= 5) {
            timerBar.classList.add('warning');
            timerBar.classList.remove('danger');
        }

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            showResult();
        }
    }, 1000);
}

function showResult() {
    // Hide timer
    document.getElementById('timerSection').style.display = 'none';

    // Show result section
    const resultSection = document.getElementById('resultSection');
    const resultMessage = document.getElementById('resultMessage');
    const explanationDisplay = document.getElementById('explanationDisplay');

    resultSection.style.display = 'block';

    const currentQuestion = quizData.questions[currentQuestionIndex];
    const correctAnswer = currentQuestion.correctAnswer;

    // Highlight correct and selected options
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach((card, index) => {
        const optionNum = index + 1;
        if (optionNum === correctAnswer) {
            card.classList.add('correct');
        }
        if (selectedAnswer && optionNum === selectedAnswer) {
            card.classList.add(selectedAnswer === correctAnswer ? 'correct' : 'incorrect');
        }
    });

    // Display result message
    if (selectedAnswer === null) {
        resultMessage.className = 'result-message correct';
        resultMessage.innerHTML = `⏰ Time's up! The correct answer is Option ${correctAnswer}`;
    } else if (selectedAnswer === correctAnswer) {
        resultMessage.className = 'result-message correct';
        resultMessage.innerHTML = `✅ Correct! You selected Option ${selectedAnswer}`;
    } else {
        resultMessage.className = 'result-message incorrect';
        resultMessage.innerHTML = `❌ Incorrect. You selected Option ${selectedAnswer}, but the correct answer is Option ${correctAnswer}`;
    }

    // Display explanation
    if (currentQuestion.explanation) {
        explanationDisplay.innerHTML = `<strong>Explanation:</strong><br>${currentQuestion.explanation}`;
    } else {
        explanationDisplay.style.display = 'none';
    }

    // Proceed to next question or end
    setTimeout(() => {
        nextQuestion();
    }, 3000);
}

function nextQuestion() {
    // Hide result
    document.getElementById('resultSection').style.display = 'none';

    // Reset options display
    document.getElementById('optionsDisplay').innerHTML = '';

    currentQuestionIndex++;

    if (currentQuestionIndex < quizData.questions.length) {
        setBackgroundForQuestion(currentQuestionIndex);
        // Next question
        selectedAnswer = null;
        displayQuestion();
        setTimeout(() => {
            displayOptions();
        }, 800);
        setTimeout(() => {
            startTimer();
        }, 3000);
    } else {
        // End quiz
        stopRecording();
        document.getElementById('restartBtn').style.display = 'block';
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
        document.getElementById('recordingStatus').style.display = 'none';
    }
}

function restartQuiz() {
    // Reset everything
    clearInterval(timerInterval);
    recordedChunks = [];
    quizData = { questions: [] };
    timeRemaining = 10;
    currentQuestionIndex = 0;
    selectedAnswer = null;

    // Reset form
    quizForm.reset();

    // Hide quiz section, show setup
    quizSection.style.display = 'none';
    setupSection.style.display = 'block';

    // Reset quiz display elements
    document.getElementById('optionsDisplay').innerHTML = '';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('downloadVideo').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('recordingStatus').style.display = 'flex';

    // Hide added questions and start button
    document.getElementById('addedQuestions').style.display = 'none';
    document.getElementById('questionsList').innerHTML = '';
    document.getElementById('startQuizBtn').style.display = 'none';
}
