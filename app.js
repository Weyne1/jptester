// Глобальные переменные
let tests = [];
let currentTest = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let showAnswersTimeout = null;
let testId = null;
let startTime = null;
let endTime = null;

// DOM элементы
const header = document.querySelector('header');
const testListContainer = document.getElementById('test-list-container');
const testContainer = document.getElementById('test-container');
const resultsContainer = document.getElementById('results-container');
const testHeaderButtons = document.getElementById('test-header-buttons');
const backToListBtn = document.getElementById('back-to-list');
const finishTestBtn = document.getElementById('finish-test');
const testTitle = document.getElementById('test-title');
const questionText = document.getElementById('question-text');
const answersContainer = document.getElementById('answers-container');
const currentQuestionDisplay = document.getElementById('current-question-display');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const showAnswersBtn = document.getElementById('show-answers-btn');
const progressFill = document.getElementById('progress-fill');
const questionNumberDisplay = document.getElementById('question-number-display');
const correctCountEl = document.getElementById('correct-count');
const scorePercentEl = document.getElementById('score-percent');
const timeSpentEl = document.getElementById('time-spent');
const totalQuestionsCountEl = document.getElementById('total-questions-count');
const restartTestBtn = document.getElementById('restart-test');
const backToTestsBtn = document.getElementById('back-to-tests');

// Функция загрузки списка тестов
async function loadTests() {
    try {
        const response = await fetch('https://inor1loveee.github.io/Lotos/tests/index.json');
        if (!response.ok) throw new Error('Ошибка загрузки списка тестов');
        const data = await response.json();
        tests = data.tests || [];
        renderTestList();
    } catch (error) {
        console.error('Ошибка:', error);
        testListContainer.innerHTML = `<div class="no-tests">Ошибка загрузки тестов: ${error.message}</div>`;
    }
}

// Отображение списка тестов
function renderTestList() {
    if (tests.length === 0) {
        testListContainer.innerHTML = '<div class="no-tests">Тесты не найдены</div>';
        return;
    }

    testListContainer.innerHTML = tests.map(test => `
        <div class="test-card">
            <div class="test-card-header">
                <h2>${escapeHtml(test.name)}</h2>
            </div>
            <div class="test-card-body">
                <div class="test-info">
                    <p><i class="fas fa-info-circle"></i> ${escapeHtml(test.description || 'Описание отсутствует')}</p>
                    <p><i class="fas fa-question-circle"></i> Вопросов: ${test.questionCount || 0}</p>
                    <p><i class="fas fa-clock"></i> Примерное время: ${test.estimatedTime || 'не указано'}</p>
                    <p><i class="fas fa-chart-line"></i> Сложность: ${test.difficulty || 'не указана'}</p>
                </div>
                <button class="start-btn" data-id="${test.id}" data-file="${test.fileName}">
                    Начать тест
                </button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.start-btn').forEach(button => {
        button.addEventListener('click', () => {
            const testId = button.getAttribute('data-id');
            const fileName = button.getAttribute('data-file');
            startTest(testId, fileName);
        });
    });
}

// Функция для экранирования HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Проверка количества правильных ответов в вопросе
function getCorrectAnswerCount(question) {
    return question.answers.filter(a => a.isCorrect).length;
}

// Запуск теста
async function startTest(id, fileName) {
    testId = id;
    testListContainer.style.display = 'none';
    testContainer.style.display = 'block';
    resultsContainer.style.display = 'none';
    testHeaderButtons.style.display = 'flex';
    header.style.display = 'none';

    try {
        const response = await fetch(`https://inor1loveee.github.io/Lotos/tests/${fileName}`);
        if (!response.ok) throw new Error('Ошибка загрузки теста');
        const data = await response.json();
        currentTest = tests.find(t => t.id === id);
        currentQuestions = data.questions || [];
        testTitle.textContent = currentTest?.description || 'Без описания';

        loadProgress();
        startTime = new Date();
        showQuestion(currentQuestionIndex);
    } catch (error) {
        console.error('Ошибка:', error);
        alert(`Ошибка загрузки теста: ${error.message}`);
        backToList();
    }
}

// Загрузка прогресса из localStorage
function loadProgress() {
    if (!testId) return;

    const savedProgress = localStorage.getItem(`test_progress_${testId}`);
    if (savedProgress) {
        try {
            const progress = JSON.parse(savedProgress);
            currentQuestionIndex = progress.currentQuestionIndex || 0;
            userAnswers = progress.userAnswers || [];

            if (userAnswers.length === 0) {
                userAnswers = new Array(currentQuestions.length).fill(null).map(() => []);
            }
        } catch (e) {
            console.error('Ошибка загрузки прогресса:', e);
            resetProgress();
        }
    } else {
        resetProgress();
    }
}

// Сброс прогресса
function resetProgress() {
    currentQuestionIndex = 0;
    userAnswers = new Array(currentQuestions.length).fill(null).map(() => []);
    saveProgress();
}

// Сохранение прогресса в localStorage
function saveProgress() {
    if (!testId) return;

    const progress = {
        currentQuestionIndex,
        userAnswers,
        lastUpdated: new Date().toISOString()
    };

    localStorage.setItem(`test_progress_${testId}`, JSON.stringify(progress));
}

// Отображение вопроса
function showQuestion(index) {
    if (index < 0 || index >= currentQuestions.length) return;

    currentQuestionIndex = index;
    const question = currentQuestions[index];

    currentQuestionDisplay.textContent = `${index + 1}/${currentQuestions.length}`;
    questionNumberDisplay.textContent = `Вопрос ${index + 1} из ${currentQuestions.length}`;

    questionNumberDisplay.onclick = () => {
        const total = currentQuestions.length;
        const input = prompt(`Введите номер вопроса (1–${total}):`);
        if (input === null) return;

        const num = parseInt(input.trim(), 10);
        if (isNaN(num) || num < 1 || num > total) {
            alert(`Пожалуйста, введите число от 1 до ${total}`);
            return;
        }
        showQuestion(num - 1);
    };

    const progressPercent = ((index + 1) / currentQuestions.length) * 100;
    progressFill.style.width = `${progressPercent}%`;

    questionText.innerHTML = escapeHtml(question.question);
    answersContainer.innerHTML = '';

    const correctCount = getCorrectAnswerCount(question);
    const inputType = correctCount > 1 ? 'checkbox' : 'radio';
    const nameAttr = inputType === 'radio' ? `question-${index}` : '';

    question.answers.forEach((answer, answerIndex) => {
        const answerElement = document.createElement('div');
        answerElement.className = 'answer-option';
        answerElement.innerHTML = `
            <input type="${inputType}" id="answer-${index}-${answerIndex}" name="${nameAttr}" data-index="${answerIndex}">
            <span class="answer-text">${escapeHtml(answer.text)}</span>
        `;
        answersContainer.appendChild(answerElement);

        const savedSelection = userAnswers[index] || [];
        let selectionToRestore = savedSelection;

        if (inputType === 'radio' && savedSelection.length > 0) {
            selectionToRestore = [savedSelection[savedSelection.length - 1]];
        }

        const isChecked = selectionToRestore.includes(answerIndex);
        if (isChecked) {
            answerElement.querySelector('input').checked = true;
            answerElement.classList.add('selected');
        }
    });

    document.querySelectorAll('.answer-option').forEach(option => {
        option.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT') return;

            const input = option.querySelector('input');
            const wasChecked = input.checked;

            if (input.type === 'radio') {
                document.querySelectorAll('.answer-option').forEach(el => el.classList.remove('selected'));
                input.checked = true;
            } else {
                input.checked = !wasChecked;
            }

            if (input.type === 'radio') {
                option.classList.add('selected');
            } else {
                option.classList.toggle('selected', input.checked);
            }

            input.dispatchEvent(new Event('change'));
        });
    });

    document.querySelectorAll('.answer-option input').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const answerIndex = parseInt(e.target.getAttribute('data-index'));
            const questionIndex = currentQuestionIndex;

            if (!userAnswers[questionIndex]) {
                userAnswers[questionIndex] = [];
            }

            if (e.target.type === 'radio') {
                // Для радио — всегда только один выбранный
                userAnswers[questionIndex] = [answerIndex];
            } else {
                // Для чекбоксов — стандартная логика
                if (e.target.checked) {
                    if (!userAnswers[questionIndex].includes(answerIndex)) {
                        userAnswers[questionIndex].push(answerIndex);
                    }
                } else {
                    userAnswers[questionIndex] = userAnswers[questionIndex].filter(a => a !== answerIndex);
                }
            }

            const option = e.target.closest('.answer-option');
            if (e.target.type === 'radio') {
                document.querySelectorAll('.answer-option').forEach(el => el.classList.remove('selected'));
                option.classList.add('selected');
            } else {
                option.classList.toggle('selected', e.target.checked);
            }

            saveProgress();
        });
    });

    // Обновление кнопок навигации
    prevBtn.disabled = (index === 0);
    nextBtn.disabled = false; // Всегда активна

    // Обновление текста кнопки "Вперёд"
    if (index === currentQuestions.length - 1) {
        nextBtn.innerHTML = '<i class="fas fa-flag-checkered"></i> Завершить тест';
    } else {
        nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
    }
}

// Подсветка правильных и неправильных ответов
function highlightAnswers() {
    const question = currentQuestions[currentQuestionIndex];

    document.querySelectorAll('.answer-option').forEach((option, index) => {
        const input = option.querySelector('input');
        const isCorrect = question.answers[index].isCorrect;
        const isSelected = input.checked;

        option.classList.remove('correct', 'incorrect', 'highlight');

        if (isCorrect) {
            option.classList.add('correct');
            //option.classList.add('highlight');
        }

        if (isSelected && !isCorrect) {
            option.classList.add('incorrect');
        }
    });
}

// Скрытие подсветки ответов
function hideAnswerHighlights() {
    document.querySelectorAll('.answer-option').forEach(el => {
        el.classList.remove('correct', 'incorrect', 'highlight');
    });
    showAnswersBtn.classList.remove('active');
}

// Расчёт результатов
function calculateResults() {
    let correct = 0;

    for (let i = 0; i < currentQuestions.length; i++) {
        const question = currentQuestions[i];
        const correctAnswers = question.answers
            .map((ans, idx) => ans.isCorrect ? idx : -1)
            .filter(idx => idx !== -1);

        const userSelection = userAnswers[i] || [];

        // Для вопросов с одним правильным ответом
        if (correctAnswers.length === 1) {
            if (userSelection.length === 1 && userSelection[0] === correctAnswers[0]) {
                correct++;
            }
        }
        // Для вопросов с несколькими правильными ответами
        else {
            const allCorrectSelected = correctAnswers.every(ca => userSelection.includes(ca));
            const noIncorrectSelected = userSelection.every(us => correctAnswers.includes(us));

            if (allCorrectSelected && noIncorrectSelected && userSelection.length === correctAnswers.length) {
                correct++;
            }
        }
    }

    return correct;
}

// Показ экрана результатов
function showResults() {
    endTime = new Date();
    const correct = calculateResults();
    const total = currentQuestions.length;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Расчёт времени
    const diffMs = endTime - startTime;
    const diffSec = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffSec / 60);
    const seconds = diffSec % 60;
    const timeStr = `${minutes} мин ${seconds} сек`;

    // Обновление DOM
    correctCountEl.textContent = `${correct} из ${total}`;
    scorePercentEl.textContent = `${percent}%`;
    timeSpentEl.textContent = timeStr;
    totalQuestionsCountEl.textContent = total;

    // Отображение экрана результатов
    testContainer.style.display = 'none';
    resultsContainer.style.display = 'flex';
    testHeaderButtons.style.display = 'none';
}

// Возврат к списку тестов
function backToList() {
    header.style.display = 'block';
    testContainer.style.display = 'none';
    resultsContainer.style.display = 'none';
    testListContainer.style.display = 'grid';
    testHeaderButtons.style.display = 'none';
    currentTest = null;
    currentQuestions = [];
    userAnswers = [];
    if (showAnswersTimeout) {
        clearTimeout(showAnswersTimeout);
        showAnswersTimeout = null;
    }
    hideAnswerHighlights();
}

// Инициализация приложения
function init() {
    loadTests();

    backToListBtn.addEventListener('click', backToList);

    finishTestBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите завершить тест?')) {
            showResults();
        }
    });

    showAnswersBtn.addEventListener('click', () => {
        if (showAnswersTimeout) {
            clearTimeout(showAnswersTimeout);
        }

        showAnswersBtn.classList.add('active');
        highlightAnswers();

        // Сокращено до 1 секунды
        showAnswersTimeout = setTimeout(() => {
            hideAnswerHighlights();
            showAnswersTimeout = null;
        }, 1000);
    });

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            showQuestion(currentQuestionIndex - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < currentQuestions.length - 1) {
            showQuestion(currentQuestionIndex + 1);
        } else {
            // Завершение теста
            showResults();
        }
    });

    // Обработчики кнопок на экране результатов
    restartTestBtn.addEventListener('click', () => {
        resetProgress();
        startTime = new Date();
        showQuestion(0);
        resultsContainer.style.display = 'none';
        testContainer.style.display = 'block';
        testHeaderButtons.style.display = 'flex';
    });

    backToTestsBtn.addEventListener('click', () => {
        header.style.display = 'block';
        backToList();
    });
}

document.addEventListener('DOMContentLoaded', init);