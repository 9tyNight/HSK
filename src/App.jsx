import React, { useState, useEffect, useRef } from 'react';
import lessons from './lessons';
import {
    BookOpen, Gamepad2, Trophy, ChevronLeft, ChevronRight,
    Volume2, RotateCcw, CheckCircle, XCircle, Menu, X, Mic
} from 'lucide-react';

// ==========================================
// UTILS
// ==========================================
const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const speak = (text) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    }
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function HSKApp() {
    const [currentDay, setCurrentDay] = useState(0);
    const [mode, setMode] = useState('dashboard');

    // Responsive State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Study State
    const [vocabIndex, setVocabIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [currentVocab, setCurrentVocab] = useState([]);

    // Quiz State
    const [quizIndex, setQuizIndex] = useState(0);
    const [quizScore, setQuizScore] = useState(0);

    // Game State
    const [gameIndex, setGameIndex] = useState(0);
    const [builtSentence, setBuiltSentence] = useState([]);
    const [availableWords, setAvailableWords] = useState([]);
    const [gameFeedback, setGameFeedback] = useState("");

    // --- NEW: Speech Recognition (Push to Talk) State ---
    const [isListening, setIsListening] = useState(false);
    const [speechFeedback, setSpeechFeedback] = useState(null);
    const recognitionRef = useRef(null); // Keeps track of the microphone instance

    const lesson = lessons[currentDay];

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- NEW: Push-to-Talk Logic ---
    const startListening = (targetText) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("Your browser doesn't support speech recognition. Please use Google Chrome.");
            return;
        }

        // Stop any previous active microphone
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setSpeechFeedback(null);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log("Heard:", transcript);

            // Clean strings for comparison (remove punctuation like periods or commas)
            const cleanTarget = targetText.replace(/[^\u4e00-\u9fa5]/g, '');
            const cleanHeard = transcript.replace(/[^\u4e00-\u9fa5]/g, '');

            if (cleanHeard && (cleanHeard.includes(cleanTarget) || cleanTarget.includes(cleanHeard))) {
                setSpeechFeedback('correct');
            } else {
                setSpeechFeedback('wrong');
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech Error:", event.error);
            setSpeechFeedback('wrong');
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop(); // Force it to stop and check what you said!
            setIsListening(false);
        }
    };

    // --- ACTIONS ---
    const handleDaySelect = (index) => {
        setCurrentDay(index);
        setMode('learn');
        setVocabIndex(0);
        setShowAnswer(false);
        setSpeechFeedback(null);
        setCurrentVocab(shuffleArray(lessons[index].vocab));
        setSidebarOpen(false);
    };

    const startQuiz = () => {
        setMode('quiz');
        setQuizIndex(0);
        setQuizScore(0);
        setSidebarOpen(false);
    };

    const startGame = () => {
        setMode('game');
        setGameIndex(0);
        setBuiltSentence([]);
        setGameFeedback("");
        setSpeechFeedback(null);
        setAvailableWords(shuffleArray(lesson.sentences[0].zh));
        setSidebarOpen(false);
    };

    const handleWordClick = (word, index) => {
        speak(word);
        const newBuilt = [...builtSentence, word];
        setBuiltSentence(newBuilt);
        const newAvailable = [...availableWords];
        newAvailable.splice(index, 1);
        setAvailableWords(newAvailable);

        const target = lesson.sentences[gameIndex].zh;
        if (newBuilt.length === target.length) {
            if (newBuilt.join('') === target.join('')) {
                setGameFeedback("CORRECT");
                speak(newBuilt.join(''));
            } else {
                setGameFeedback("WRONG");
            }
        }
    };

    const nextGameSentence = () => {
        if (gameIndex + 1 < lesson.sentences.length) {
            setGameIndex(i => i + 1);
            setBuiltSentence([]);
            setGameFeedback("");
            setSpeechFeedback(null);
            setAvailableWords(shuffleArray(lesson.sentences[gameIndex + 1].zh));
        } else {
            setMode('dashboard');
        }
    };

    // --- RENDERERS ---

    const renderSidebar = () => {
        const sidebarStyle = {
            ...styles.sidebar,
            position: isMobile ? 'absolute' : 'relative',
            transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
            width: isMobile ? '80%' : '260px',
            maxWidth: '300px',
            boxShadow: isMobile && sidebarOpen ? '4px 0 15px rgba(0,0,0,0.1)' : 'none',
        };

        return (
            <div style={sidebarStyle}>
                <div style={styles.sidebarHeader}>
                    <div style={styles.logo} onClick={() => setMode('dashboard')}>HSK Speed Run 🚀</div>
                    {isMobile && (
                        <button style={styles.closeBtn} onClick={() => setSidebarOpen(false)}>
                            <X size={24} />
                        </button>
                    )}
                </div>

                <div style={styles.sidebarContent}>
                    <div style={styles.sectionTitle}>Daily Lessons</div>
                    <div style={styles.lessonList}>
                        {lessons.map((l, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleDaySelect(idx)}
                                style={{
                                    ...styles.navItem,
                                    background: currentDay === idx ? '#e0e7ff' : 'transparent',
                                    color: currentDay === idx ? '#4f46e5' : '#64748b',
                                    fontWeight: currentDay === idx ? 'bold' : 'normal'
                                }}
                            >
                                <span>Day {l.day}</span>
                                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{l.title.split(':')[1]}</span>
                            </button>
                        ))}
                    </div>

                    <div style={styles.sectionTitle}>Quick Practice</div>
                    <div style={styles.gamesList}>
                        <button style={styles.gameNavItem} onClick={startGame}>
                            <Gamepad2 size={18} /> Sentence Builder
                        </button>
                        <button style={styles.gameNavItem} onClick={startQuiz}>
                            <BookOpen size={18} /> Pop Quiz
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderDashboard = () => (
        <div style={styles.dashboardContainer}>
            <h1 style={styles.dashTitle}>Welcome Back!</h1>
            <p style={styles.dashSub}>Select a lesson from the sidebar to start your daily speed run.</p>
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <h3>Total Lessons</h3>
                    <h1>{lessons.length}</h1>
                </div>
                <div style={styles.statCard}>
                    <h3>Current Level</h3>
                    <h1>HSK 1</h1>
                </div>
            </div>
            <button style={styles.primaryBtn} onClick={() => handleDaySelect(0)}>
                Start Day 1 <ChevronRight />
            </button>
        </div>
    );

    const renderLearn = () => {
        const word = currentVocab[vocabIndex] || lesson.vocab[0];
        return (
            <div style={styles.workspace}>
                <div style={styles.topBar}>
                    <h2>{lesson.title}</h2>
                    <div style={styles.modeBadges}>
                        <span style={styles.activeBadge}>Flashcards</span>
                    </div>
                </div>

                <div style={styles.flashcardWrapper}>
                    <div style={styles.flashcard} onClick={() => setShowAnswer(!showAnswer)}>
                        <div style={styles.cardFront}>
                            <div style={styles.char}>{word.char}</div>

                            <div style={styles.cardActions}>
                                <button style={styles.audioBtn} onClick={(e) => { e.stopPropagation(); speak(word.char); }}>
                                    <Volume2 size={20} />
                                </button>

                                {/* NEW PUSH TO TALK BUTTON */}
                                <button
                                    style={{
                                        ...styles.audioBtn,
                                        background: isListening ? '#fee2e2' : '#f1f5f9',
                                        color: isListening ? '#ef4444' : '#4f46e5',
                                        userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none'
                                    }}
                                    onMouseDown={(e) => { e.stopPropagation(); startListening(word.char); }}
                                    onMouseUp={(e) => { e.stopPropagation(); stopListening(); }}
                                    onMouseLeave={(e) => { e.stopPropagation(); stopListening(); }}
                                    onTouchStart={(e) => { e.stopPropagation(); startListening(word.char); }}
                                    onTouchEnd={(e) => { e.stopPropagation(); stopListening(); }}
                                >
                                    <Mic size={20} />
                                </button>
                            </div>
                        </div>

                        <div style={{ ...styles.cardBack, opacity: showAnswer ? 1 : 0 }}>
                            <div style={styles.pinyin}>{word.pinyin}</div>
                            <div style={styles.en}>{word.en}</div>
                        </div>

                        {!showAnswer && <div style={styles.hintText}>Click to reveal</div>}

                        {speechFeedback === 'correct' && <div style={styles.feedbackGood}>🎉 Perfect Pronunciation!</div>}
                        {speechFeedback === 'wrong' && <div style={styles.feedbackBad}>Try again! Keep practicing.</div>}
                        {isListening && <div style={styles.feedbackListening}>Hold and speak...</div>}
                    </div>

                    <div style={styles.controlsBar}>
                        <button style={styles.iconBtn} disabled={vocabIndex === 0} onClick={() => { setVocabIndex(i => i - 1); setShowAnswer(false); setSpeechFeedback(null); }}>
                            <ChevronLeft size={20} />
                        </button>
                        <span style={styles.counter}>{vocabIndex + 1} / {lesson.vocab.length}</span>
                        <button style={styles.iconBtn} disabled={vocabIndex === lesson.vocab.length - 1} onClick={() => { setVocabIndex(i => i + 1); setShowAnswer(false); setSpeechFeedback(null); }}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div style={styles.actionRow}>
                    <button style={{ ...styles.actionBtn, background: '#fef3c7', color: '#d97706' }} onClick={startQuiz}>
                        <BookOpen size={18} /> Practice Quiz
                    </button>
                    <button style={{ ...styles.actionBtn, background: '#dcfce7', color: '#16a34a' }} onClick={startGame}>
                        <Gamepad2 size={18} /> Sentence Game
                    </button>
                </div>
            </div>
        );
    };

    const renderQuiz = () => {
        if (quizIndex >= lesson.quiz.length) {
            return (
                <div style={styles.resultContainer}>
                    <Trophy size={60} color="#fbbf24" />
                    <h1>Quiz Complete!</h1>
                    <h2 style={{ fontSize: '2.5rem', color: '#4f46e5' }}>{quizScore} / {lesson.quiz.length}</h2>
                    <button style={styles.primaryBtn} onClick={() => setMode('learn')}>Back to Lesson</button>
                </div>
            );
        }
        const q = lesson.quiz[quizIndex];
        return (
            <div style={styles.workspace}>
                <button style={styles.backLink} onClick={() => setMode('learn')}>← Back</button>
                <div style={styles.quizCard}>
                    <div style={styles.progressText}>Question {quizIndex + 1} of {lesson.quiz.length}</div>
                    <h2 style={styles.questionText}>{q.q}</h2>
                    <div style={styles.optionsGrid}>
                        {q.options.map((opt, idx) => (
                            <button key={idx} style={styles.optionBtn} onClick={() => {
                                if (idx === q.correct) setQuizScore(s => s + 1);
                                setQuizIndex(i => i + 1);
                            }}>
                                <span style={styles.optLetter}>{['A', 'B', 'C'][idx]}</span> {opt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderGame = () => {
        const s = lesson.sentences[gameIndex];
        const isCorrect = gameFeedback === "CORRECT";
        const targetSentence = s.zh.join('');

        return (
            <div style={styles.workspace}>
                <button style={styles.backLink} onClick={() => setMode('learn')}>← Exit</button>
                <div style={styles.gameContainer}>
                    <div style={styles.levelBadge}>Level {gameIndex + 1}</div>
                    <h2 style={styles.englishPrompt}>"{s.en}"</h2>

                    <div style={{
                        ...styles.dropZone,
                        borderColor: isCorrect ? '#22c55e' : gameFeedback === "WRONG" ? '#ef4444' : '#cbd5e1'
                    }}>
                        {builtSentence.length === 0 && <span style={{ color: '#94a3b8' }}>Tap words...</span>}
                        {builtSentence.map((w, i) => <span key={i} style={styles.wordBubble}>{w}</span>)}
                    </div>

                    {isCorrect && (
                        <div style={styles.pronounceBox}>
                            <p style={{ marginBottom: '10px', color: '#64748b', fontSize: '0.9rem' }}>Now practice saying it!</p>

                            {/* NEW PUSH TO TALK BUTTON */}
                            <button
                                style={{
                                    ...styles.micBtnLg,
                                    background: isListening ? '#fee2e2' : '#f1f5f9',
                                    color: isListening ? '#ef4444' : '#4f46e5',
                                    border: isListening ? '2px solid #ef4444' : '2px solid transparent',
                                    userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none'
                                }}
                                onMouseDown={() => startListening(targetSentence)}
                                onMouseUp={stopListening}
                                onMouseLeave={stopListening}
                                onTouchStart={(e) => { e.stopPropagation(); startListening(targetSentence); }}
                                onTouchEnd={(e) => { e.stopPropagation(); stopListening(); }}
                            >
                                <Mic size={24} /> {isListening ? "Release to Check" : "Hold to Talk"}
                            </button>

                            {speechFeedback === 'correct' && <div style={styles.feedbackGood}>🎉 Perfect!</div>}
                            {speechFeedback === 'wrong' && <div style={styles.feedbackBad}>Not quite, try again!</div>}
                        </div>
                    )}

                    {!isCorrect && (
                        <div style={styles.wordBank}>
                            {availableWords.map((w, i) => (
                                <button key={i} style={styles.bankChip} onClick={() => handleWordClick(w, i)}>{w}</button>
                            ))}
                        </div>
                    )}

                    {isCorrect && (
                        <button style={styles.nextLevelBtn} onClick={nextGameSentence}>
                            Next Sentence <ChevronRight size={16} />
                        </button>
                    )}

                    {!isCorrect && (
                        <button style={styles.resetBtn} onClick={() => {
                            setBuiltSentence([]);
                            setAvailableWords(shuffleArray(lesson.sentences[gameIndex].zh));
                            setGameFeedback("");
                        }}>
                            <RotateCcw size={16} /> Reset
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={styles.layout}>
            {isMobile && (
                <div style={styles.mobileHeader}>
                    <div style={styles.logo}>HSK Speed Run</div>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none' }}>
                        <Menu />
                    </button>
                </div>
            )}

            {renderSidebar()}

            <div style={{
                ...styles.mainContent,
                paddingTop: isMobile ? '70px' : '20px'
            }}>
                {mode === 'dashboard' && renderDashboard()}
                {mode === 'learn' && renderLearn()}
                {mode === 'quiz' && renderQuiz()}
                {mode === 'game' && renderGame()}
            </div>

            {isMobile && sidebarOpen && <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />}
        </div>
    );
}

// ==========================================
// CSS-IN-JS STYLES 
// ==========================================
const styles = {
    layout: { display: 'flex', minHeight: '100vh', height: '100dvh', width: '100%', overflow: 'hidden', position: 'relative', background: '#f8fafc' },

    // Sidebar
    sidebar: {
        background: '#ffffff', borderRight: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', height: '100%',
        zIndex: 50, top: 0, left: 0,
        transition: 'transform 0.3s ease',
    },
    sidebarHeader: { padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { fontWeight: '800', fontSize: '1.1rem', color: '#4f46e5', cursor: 'pointer' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
    sidebarContent: { flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column' },
    sectionTitle: { fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '15px', marginBottom: '8px', paddingLeft: '10px' },
    lessonList: { marginBottom: '10px' },
    navItem: {
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        width: '100%', padding: '10px 14px', border: 'none', borderRadius: '8px',
        cursor: 'pointer', marginBottom: '2px', textAlign: 'left', transition: 'background 0.2s', fontSize: '0.9rem'
    },
    gamesList: { display: 'flex', flexDirection: 'column', gap: '5px' },
    gameNavItem: {
        display: 'flex', alignItems: 'center', gap: '8px',
        width: '100%', padding: '10px 14px', border: 'none', borderRadius: '8px',
        cursor: 'pointer', textAlign: 'left', background: '#f0f9ff', color: '#0284c7', fontWeight: '600', fontSize: '0.9rem'
    },
    mobileHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px', background: 'white', borderBottom: '1px solid #e2e8f0',
        position: 'absolute', top: 0, width: '100%', zIndex: 40,
    },

    // Main Content
    mainContent: { flex: 1, background: '#f8fafc', overflowY: 'auto', padding: '15px', position: 'relative', height: '100%' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 45 },

    // Dashboard
    dashboardContainer: { maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '20px', paddingBottom: '40px' },
    dashTitle: { fontSize: '2rem', color: '#1e293b', marginBottom: '5px' },
    dashSub: { color: '#64748b', fontSize: '1rem', marginBottom: '30px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' },
    statCard: { background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    primaryBtn: { background: '#4f46e5', color: 'white', padding: '14px 28px', borderRadius: '12px', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' },

    // Workspace
    workspace: { maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' },

    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    activeBadge: { background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' },
    backLink: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem' },

    // Flashcards
    flashcardWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '10px 0' },
    flashcard: {
        width: '100%', maxWidth: '400px',
        minHeight: '240px',
        background: 'white',
        borderRadius: '20px', boxShadow: '0 8px 12px -3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative', transition: 'transform 0.2s',
        marginBottom: '10px', padding: '20px'
    },
    char: { fontSize: '4rem', fontWeight: '800', color: '#1e293b' },

    cardActions: { position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px', flexDirection: 'column' },
    audioBtn: { background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', color: '#4f46e5', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },

    cardBack: { textAlign: 'center', transition: 'opacity 0.3s' },
    pinyin: { fontSize: '1.5rem', color: '#4f46e5', fontWeight: '600' },
    en: { fontSize: '1.2rem', color: '#64748b' },
    hintText: { position: 'absolute', bottom: '15px', color: '#cbd5e1', fontSize: '0.8rem' },

    feedbackGood: { position: 'absolute', bottom: '10px', background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' },
    feedbackBad: { position: 'absolute', bottom: '10px', background: '#fee2e2', color: '#ef4444', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' },
    feedbackListening: { position: 'absolute', bottom: '10px', background: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', animation: 'pulse 1.5s infinite' },

    controlsBar: { display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' },
    iconBtn: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', padding: '10px', cursor: 'pointer', color: '#475569', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    counter: { fontSize: '1rem', fontWeight: '600', color: '#64748b' },

    actionRow: { display: 'flex', flexWrap: 'wrap', gap: '10px', paddingBottom: '30px' },
    actionBtn: { flex: '1 1 140px', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },

    // Quiz
    resultContainer: { textAlign: 'center', paddingTop: '40px', paddingBottom: '40px' },
    quizCard: { background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    progressText: { color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '8px' },
    questionText: { fontSize: '1.4rem', color: '#1e293b', marginBottom: '20px' },
    optionsGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '10px' },
    optionBtn: { padding: '14px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', textAlign: 'left', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' },
    optLetter: { background: '#e2e8f0', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', marginRight: '10px', fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' },

    // Game
    gameContainer: { maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center', paddingBottom: '30px' },
    levelBadge: { display: 'inline-block', background: '#e0e7ff', color: '#4338ca', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '15px' },
    englishPrompt: { fontSize: '1.2rem', color: '#64748b', marginBottom: '20px' },
    dropZone: { minHeight: '80px', background: 'white', border: '3px dashed #cbd5e1', borderRadius: '16px', padding: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' },
    wordBubble: { background: '#4f46e5', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: '600' },

    pronounceBox: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
    micBtnLg: { padding: '12px 24px', borderRadius: '30px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 'bold', transition: 'all 0.2s' },

    wordBank: { display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '30px' },
    bankChip: { background: 'white', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    nextLevelBtn: { background: '#22c55e', color: 'white', padding: '14px 28px', borderRadius: '12px', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '10px', width: '100%', justifyContent: 'center' },
    resetBtn: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }
};