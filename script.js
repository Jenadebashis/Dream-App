// Global variables
let mediaRecorder;
let recordedChunks = [];
let quizData = {};
let timerInterval;
let timeRemaining = 10;
let stream;

// DOM Elements
const quizForm = document.getElementById('quizForm');
const setupSection = document.getElementById('setupSection');
const quizSection = document.getElementById('quizSection');
const answerFormatRadios = document.querySelectorAll('input[name="answerFormat"]');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // Answer format change
    answerFormatRadios.forEach(radio => {
        radio.addEventListener('change', handleAnswerFormatChange);
    });

    // Form submission
    quizForm.addEventListener('submit', handleFormSubmit);

    // Restart button
    document.getElementById('restartBtn').addEventListener('click', restartQuiz);
}

function handleAnswerFormatChange(e) {
    const format = e.target.value;
    const textInputs = document.querySelectorAll('.option-input input[type="text"]');
    const imageInputs = document.querySelectorAll('.option-input input[type="file"]');

    if (format === 'text') {
        textInputs.forEach(input => {
            input.style.display = 'block';
            input.required = true;
        });
        imageInputs.forEach(input => {
            input.style.display = 'none';
            input.required = false;
        });
    } else if (format === 'image') {
        textInputs.forEach(input => {
            input.style.display = 'none';
            input.required = false;
        });
        imageInputs.forEach(input => {
            input.style.display = 'block';
            input.required = true;
        });
    } else { // both
        textInputs.forEach(input => {
            input.style.display = 'block';
            input.required = true;
        });
        imageInputs.forEach(input => {
            input.style.display = 'block';
            input.required = true;
        });
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const format = document.querySelector('input[name="answerFormat"]:checked').value;

    // Validate based on format
    let isValid = true;
    const errorMessages = [];

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

    if (!isValid) {
        alert('Please fill in all required fields:\n' + errorMessages.join('\n'));
        return;
    }

    // Collect form data
    quizData = {
        questionText: document.getElementById('questionText').value,
        answerFormat: format,
        options: [],
        correctAnswer: parseInt(document.getElementById('correctAnswer').value),
        explanation: document.getElementById('answerExplanation').value
    };

    // Get options
    for (let i = 1; i <= 4; i++) {
        const text = document.getElementById(`option${i}`).value;
        const imageFile = document.getElementById(`optionImage${i}`).files[0];
        let imageData = null;
        
        if (imageFile) {
            imageData = await fileToDataURL(imageFile);
        }

        quizData.options.push({
            text: text,
            image: imageData
        });
    }

    // Start the quiz
    startQuiz();
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
    // Hide setup, show quiz
    setupSection.style.display = 'none';
    quizSection.style.display = 'block';

    // Start recording
    await startRecording();

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

function displayQuestion() {
    const questionTextElem = document.getElementById('displayQuestionText');
    questionTextElem.textContent = quizData.questionText;
}

function displayOptions() {
    const optionsDisplay = document.getElementById('optionsDisplay');
    optionsDisplay.innerHTML = '';

    quizData.options.forEach((option, index) => {
        const optionCard = document.createElement('div');
        optionCard.className = 'option-card';
        optionCard.dataset.optionNumber = index + 1;

        const optionNumber = document.createElement('span');
        optionNumber.className = 'option-number';
        optionNumber.textContent = `Option ${index + 1}`;
        optionCard.appendChild(optionNumber);

        if ((quizData.answerFormat === 'text' || quizData.answerFormat === 'both') && option.text) {
            const optionText = document.createElement('div');
            optionText.className = 'option-text';
            optionText.textContent = option.text;
            optionCard.appendChild(optionText);
        }

        if ((quizData.answerFormat === 'image' || quizData.answerFormat === 'both') && option.image) {
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

    // Highlight correct option
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach((card, index) => {
        const optionNum = index + 1;
        if (optionNum === quizData.correctAnswer) {
            card.classList.add('correct');
        }
    });

    // Display result message
    resultMessage.className = 'result-message correct';
    resultMessage.innerHTML = `✅ The correct answer is Option ${quizData.correctAnswer}`;

    // Display explanation
    if (quizData.explanation) {
        explanationDisplay.innerHTML = `<strong>Explanation:</strong><br>${quizData.explanation}`;
    } else {
        explanationDisplay.style.display = 'none';
    }

    // Stop recording after a delay to show result
    setTimeout(() => {
        stopRecording();
        document.getElementById('restartBtn').style.display = 'block';
    }, 3000);
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
    quizData = {};
    timeRemaining = 10;

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
}
