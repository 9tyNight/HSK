import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Headphones,
  Layers3,
  Menu,
  Mic,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import lessons from './lessons';
import './App.css';

const byteMap = {
  0x201A: 0x82,
  0x0192: 0x83,
  0x201E: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02C6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8A,
  0x2039: 0x8B,
  0x0152: 0x8C,
  0x017D: 0x8E,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201C: 0x93,
  0x201D: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02DC: 0x98,
  0x2122: 0x99,
  0x0161: 0x9A,
  0x203A: 0x9B,
  0x0153: 0x9C,
  0x017E: 0x9E,
  0x0178: 0x9F,
};

const decodeMojibake = (value) => {
  if (typeof value !== 'string' || !/[ÃÂÆ]|[ÄÅæåä][\u0080-\uFFFF]/.test(value)) {
    return value;
  }

  const bytes = [];
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0xff) {
      bytes.push(code);
    } else if (byteMap[code]) {
      bytes.push(byteMap[code]);
    } else {
      return value;
    }
  }

  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return value;
  }
};

const normalizeLesson = (lesson) => ({
  ...lesson,
  title: decodeMojibake(lesson.title),
  vocab: lesson.vocab.map((word) => ({
    char: decodeMojibake(word.char),
    pinyin: decodeMojibake(word.pinyin),
    en: decodeMojibake(word.en),
  })),
  quiz: lesson.quiz.map((item) => ({
    ...item,
    q: decodeMojibake(item.q),
    options: item.options.map(decodeMojibake),
  })),
  sentences: lesson.sentences.map((sentence) => ({
    en: decodeMojibake(sentence.en),
    zh: sentence.zh.map(decodeMojibake),
  })),
});

const shuffleArray = (items) => [...items].sort(() => Math.random() - 0.5);
const normalizedSourceLessons = lessons.map(normalizeLesson);

const speak = (text) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
};

const StatCard = ({ icon, label, value, detail, tone = 'indigo' }) => (
  <article className={`stat-card ${tone}`}>
    <div className="stat-icon" aria-hidden="true">
      {React.createElement(icon, { size: 22 })}
    </div>
    <p>{label}</p>
    <strong>{value}</strong>
    <span>{detail}</span>
  </article>
);

const ProgressRing = ({ value }) => {
  const degrees = Math.round((value / 100) * 360);
  return (
    <div
      className="progress-ring"
      style={{ '--progress': `${degrees}deg` }}
      role="img"
      aria-label={`${value}% weekly progress`}
    >
      <span>{value}%</span>
    </div>
  );
};

export default function App() {
  const normalizedLessons = useMemo(() => normalizedSourceLessons, []);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentLesson, setCurrentLesson] = useState(0);
  const [flashIndex, setFlashIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [builtSentence, setBuiltSentence] = useState([]);
  const [wordBank, setWordBank] = useState(() => shuffleArray(normalizedSourceLessons[0].sentences[0].zh));
  const [mobileNav, setMobileNav] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready for focused study.');

  const lesson = normalizedLessons[currentLesson];
  const word = lesson.vocab[flashIndex] || lesson.vocab[0];
  const sentence = lesson.sentences[sentenceIndex] || lesson.sentences[0];
  const completedLessons = 9;
  const totalVocab = normalizedLessons.reduce((total, item) => total + item.vocab.length, 0);

  const selectLesson = (index) => {
    setCurrentLesson(index);
    setFlashIndex(0);
    setShowAnswer(false);
    setQuizIndex(0);
    setQuizScore(0);
    setSentenceIndex(0);
    setBuiltSentence([]);
    setWordBank(shuffleArray(normalizedLessons[index].sentences[0].zh));
    setStatusMessage(`Opened ${normalizedLessons[index].title}.`);
    setActiveTab('lessons');
    setMobileNav(false);
  };

  const startPractice = () => {
    setActiveTab('practice');
    setSentenceIndex(0);
    setBuiltSentence([]);
    setWordBank(shuffleArray(lesson.sentences[0].zh));
    setStatusMessage('Sentence builder loaded.');
  };

  const startQuiz = () => {
    setActiveTab('review');
    setQuizIndex(0);
    setQuizScore(0);
    setStatusMessage('Quiz review started.');
  };

  const addWord = (selectedWord, index) => {
    const nextSentence = [...builtSentence, selectedWord];
    const nextBank = [...wordBank];
    nextBank.splice(index, 1);
    setBuiltSentence(nextSentence);
    setWordBank(nextBank);
    speak(selectedWord);

    if (nextSentence.length === sentence.zh.length) {
      const isCorrect = nextSentence.join('') === sentence.zh.join('');
      setStatusMessage(isCorrect ? 'Correct sentence order.' : 'That order needs another try.');
    }
  };

  const resetSentence = () => {
    setBuiltSentence([]);
    setWordBank(shuffleArray(sentence.zh));
    setStatusMessage('Sentence builder reset.');
  };

  const nextSentence = () => {
    const nextIndex = (sentenceIndex + 1) % lesson.sentences.length;
    setSentenceIndex(nextIndex);
    setBuiltSentence([]);
    setWordBank(shuffleArray(lesson.sentences[nextIndex].zh));
    setStatusMessage('Next speaking prompt loaded.');
  };

  const answerQuiz = (optionIndex) => {
    if (optionIndex === lesson.quiz[quizIndex].correct) {
      setQuizScore((score) => score + 1);
      setStatusMessage('Correct answer recorded.');
    } else {
      setStatusMessage('Answer saved. Review the explanation after the quiz.');
    }
    setQuizIndex((index) => index + 1);
  };

  const navigation = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'lessons', label: 'Lessons', icon: BookOpen },
    { id: 'practice', label: 'Practice', icon: Mic },
    { id: 'review', label: 'Review', icon: Trophy },
  ];

  const renderNav = () => (
    <nav className="app-nav" aria-label="Primary navigation">
      {navigation.map(({ id, label, icon }) => (
        <button
          className={activeTab === id ? 'active' : ''}
          key={id}
          onClick={() => {
            setActiveTab(id);
            setMobileNav(false);
          }}
          type="button"
        >
          {React.createElement(icon, { size: 19, 'aria-hidden': true })}
          {label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            MF
          </div>
          <div>
            <strong>MandarinFlow</strong>
            <span>HSK learning studio</span>
          </div>
        </div>
        {renderNav()}
        <section className="coach-card" aria-labelledby="coach-title">
          <div className="coach-icon" aria-hidden="true">
            <Sparkles size={22} />
          </div>
          <h2 id="coach-title">Today&apos;s focus</h2>
          <p>Finish one lesson, review ten words, then speak two sentences out loud.</p>
          <button type="button" onClick={startPractice}>
            Start guided practice
          </button>
        </section>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" type="button" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div>
            <span className="eyebrow">HSK 1 sprint plan</span>
            <h1>Structured Chinese learning that feels clear and motivating.</h1>
          </div>
          <div className="search-pill">
            <Search size={18} aria-hidden="true" />
            <span>Search lessons</span>
          </div>
        </header>

        <div className="status-bar" aria-live="polite">
          {statusMessage}
        </div>

        {activeTab === 'overview' && (
          <section className="dashboard-grid">
            <div className="hero-card">
              <div>
                <span className="eyebrow">Portfolio-ready learning product</span>
                <h2>Lessons, flashcards, quizzes, and speaking practice in one responsive app.</h2>
                <p>
                  MandarinFlow turns daily HSK content into a polished study workspace for learners,
                  tutors, and education teams that need a custom language learning platform.
                </p>
                <div className="hero-actions">
                  <button type="button" onClick={() => selectLesson(0)}>
                    <Play size={18} aria-hidden="true" />
                    Start Day 1
                  </button>
                  <button className="secondary" type="button" onClick={startQuiz}>
                    Review quiz
                  </button>
                </div>
              </div>
              <ProgressRing value={64} />
            </div>

            <div className="stats-row">
              <StatCard icon={BookOpen} label="Lessons mapped" value={normalizedLessons.length} detail="2 week sprint" />
              <StatCard icon={Layers3} label="Vocabulary cards" value={totalVocab} detail="HSK foundation" tone="green" />
              <StatCard icon={Clock3} label="Review queue" value="18 min" detail="due today" tone="amber" />
              <StatCard icon={Target} label="Accuracy" value="86%" detail="last session" tone="pink" />
            </div>

            <section className="learning-map" aria-labelledby="map-title">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Learning path</span>
                  <h2 id="map-title">Two-week HSK study plan</h2>
                </div>
                <span>{completedLessons}/{normalizedLessons.length} completed</span>
              </div>
              <div className="lesson-grid">
                {normalizedLessons.slice(0, 12).map((item, index) => (
                  <button
                    className={index < completedLessons ? 'lesson-chip done' : 'lesson-chip'}
                    key={`${item.day}-${item.title}`}
                    onClick={() => selectLesson(index)}
                    type="button"
                  >
                    <span>Day {item.day}</span>
                    <strong>{item.title.replace(/^Day \d+:\s*/, '')}</strong>
                    {index < completedLessons && <CheckCircle2 size={18} aria-label="Completed" />}
                  </button>
                ))}
              </div>
            </section>

            <section className="phone-preview" aria-labelledby="phone-title">
              <div>
                <span className="eyebrow">Mobile first</span>
                <h2 id="phone-title">Learners can study in quick pockets of time.</h2>
                <p>Cards, audio, quiz choices, and progress cues are designed for one-handed mobile use.</p>
              </div>
              <div className="phone-frame">
                <div className="phone-header" />
                <div className="phone-card">
                  <span>{word.pinyin}</span>
                  <strong>{word.char}</strong>
                  <p>{word.en}</p>
                </div>
                <button type="button" onClick={() => speak(word.char)}>
                  <Volume2 size={16} />
                  Listen
                </button>
              </div>
            </section>
          </section>
        )}

        {activeTab === 'lessons' && (
          <section className="lesson-workspace">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Active lesson</span>
                <h2>{lesson.title}</h2>
              </div>
              <button type="button" onClick={startPractice}>
                Sentence practice
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="lesson-layout">
              <div className="flashcard" onClick={() => setShowAnswer((value) => !value)} role="button" tabIndex={0}>
                <span>Card {flashIndex + 1} of {lesson.vocab.length}</span>
                <strong>{word.char}</strong>
                <p>{showAnswer ? `${word.pinyin} · ${word.en}` : 'Tap to reveal pinyin and meaning'}</p>
                <div className="flash-actions">
                  <button type="button" onClick={(event) => { event.stopPropagation(); speak(word.char); }}>
                    <Headphones size={18} />
                    Audio
                  </button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); setShowAnswer((value) => !value); }}>
                    Flip
                  </button>
                </div>
              </div>

              <div className="vocab-list">
                {lesson.vocab.map((item, index) => (
                  <button
                    className={flashIndex === index ? 'active' : ''}
                    key={`${item.char}-${item.en}`}
                    onClick={() => {
                      setFlashIndex(index);
                      setShowAnswer(true);
                    }}
                    type="button"
                  >
                    <strong>{item.char}</strong>
                    <span>{item.pinyin}</span>
                    <small>{item.en}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'practice' && (
          <section className="practice-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Sentence builder</span>
                <h2>{sentence.en}</h2>
              </div>
              <button type="button" onClick={nextSentence}>
                Next prompt
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="drop-zone">
              {builtSentence.length === 0 ? <span>Tap words below to build the sentence</span> : builtSentence.map((part, index) => <strong key={`${part}-${index}`}>{part}</strong>)}
            </div>

            <div className="word-bank">
              {wordBank.map((part, index) => (
                <button key={`${part}-${index}`} onClick={() => addWord(part, index)} type="button">
                  {part}
                </button>
              ))}
            </div>

            <div className="practice-actions">
              <button type="button" onClick={resetSentence}>
                <RotateCcw size={18} />
                Reset
              </button>
              <button type="button" onClick={() => speak(sentence.zh.join(''))}>
                <Volume2 size={18} />
                Play full sentence
              </button>
              <button type="button">
                <Mic size={18} />
                Speaking check
              </button>
            </div>
          </section>
        )}

        {activeTab === 'review' && (
          <section className="review-panel">
            {quizIndex >= lesson.quiz.length ? (
              <div className="result-card">
                <Trophy size={48} aria-hidden="true" />
                <span>Review complete</span>
                <h2>{quizScore}/{lesson.quiz.length} correct</h2>
                <p>Great material for a client MVP: scoring, progress, review loops, and content expansion are already visible.</p>
                <button type="button" onClick={startQuiz}>Try again</button>
              </div>
            ) : (
              <div className="quiz-card">
                <span>Question {quizIndex + 1} of {lesson.quiz.length}</span>
                <h2>{lesson.quiz[quizIndex].q}</h2>
                <div className="quiz-options">
                  {lesson.quiz[quizIndex].options.map((option, index) => (
                    <button key={option} onClick={() => answerQuiz(index)} type="button">
                      <span>{String.fromCharCode(65 + index)}</span>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {mobileNav && (
        <button className="nav-scrim" type="button" onClick={() => setMobileNav(false)} aria-label="Close menu">
          <X size={22} />
        </button>
      )}
    </div>
  );
}
