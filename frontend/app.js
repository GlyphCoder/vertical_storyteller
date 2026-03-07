const { useState, useEffect, useRef } = React;

// Session Storage Helper
const SessionStorage = {
    save: (data, formData) => {
        try {
            const sessions = JSON.parse(localStorage.getItem('storyArcSessions')) || [];
            const session = {
                id: Date.now(),
                timestamp: new Date().toLocaleString(),
                title: formData.core_idea.substring(0, 50) + (formData.core_idea.length > 50 ? '...' : ''),
                genre: formData.genre,
                episodes: formData.episode_count,
                data: data
            };
            sessions.unshift(session);
            if (sessions.length > 10) sessions.pop();
            localStorage.setItem('storyArcSessions', JSON.stringify(sessions));
            return session;
        } catch (e) {
            console.error('Failed to save session:', e);
        }
    },
    load: () => {
        try {
            return JSON.parse(localStorage.getItem('storyArcSessions')) || [];
        } catch (e) {
            return [];
        }
    },
    remove: (id) => {
        try {
            const sessions = JSON.parse(localStorage.getItem('storyArcSessions')) || [];
            const filtered = sessions.filter(s => s.id !== id);
            localStorage.setItem('storyArcSessions', JSON.stringify(filtered));
        } catch (e) {
            console.error('Failed to remove session:', e);
        }
    }
};

// Main App Component
function App() {
    const [currentView, setCurrentView] = useState('home');
    const [loading, setLoading] = useState(false);
    const [generatedData, setGeneratedData] = useState(null);
    const [darkMode, setDarkMode] = useState(true);
    const [showDocs, setShowDocs] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [sessions, setSessions] = useState(() => SessionStorage.load());
    const [formData, setFormData] = useState({
        core_idea: '',
        episode_count: 6,
        genre: 'Drama',
        tone: 'Dramatic',
        target_audience: '18-35',
        model_name: 'gemini-3.1-flash-lite-preview'
    });
    
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const response = await fetch('http://localhost:8000/api/analyse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'API request failed');
            }
            
            const data = await response.json();
            const savedSession = SessionStorage.save(data, formData);
            setGeneratedData(data);
            setSessions(SessionStorage.load());
            setCurrentView('results');
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    const loadSession = (sessionData) => {
        setGeneratedData(sessionData);
        setCurrentView('results');
    };
    
    return (
        <div className="w-full min-h-screen relative overflow-hidden">
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/20 dark:bg-primary/10 mix-blend-multiply dark:mix-blend-lighten filter blur-[100px] opacity-70 animate-blob"></div>
                <div className="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-secondary/20 dark:bg-secondary/10 mix-blend-multiply dark:mix-blend-lighten filter blur-[100px] opacity-70 animate-blob" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-pink-500/20 dark:bg-pink-500/10 mix-blend-multiply dark:mix-blend-lighten filter blur-[100px] opacity-70 animate-blob" style={{ animationDelay: '4s' }}></div>
            </div>

            <div className="relative z-10">
                {currentView === 'home' && (
                    <HomePage 
                        setCurrentView={setCurrentView}
                        formData={formData}
                        setFormData={setFormData}
                        handleSubmit={handleSubmit}
                        loading={loading}
                        darkMode={darkMode}
                        setDarkMode={setDarkMode}
                        showDocs={showDocs}
                        setShowDocs={setShowDocs}
                        showGuide={showGuide}
                        setShowGuide={setShowGuide}
                        sessions={sessions}
                        loadSession={loadSession}
                    />
                )}
                {currentView === 'results' && generatedData && (
                    <ResultsPage 
                        data={generatedData}
                        setCurrentView={setCurrentView}
                        darkMode={darkMode}
                        setDarkMode={setDarkMode}
                        showDocs={showDocs}
                        setShowDocs={setShowDocs}
                        showGuide={showGuide}
                        setShowGuide={setShowGuide}
                    />
                )}
            </div>
        </div>
    );
}
}

function Header({ darkMode, setDarkMode, setShowDocs, setShowGuide, isResultsPage, setCurrentView }) {
    return (
        <header className="sticky top-0 z-50 glass-card border-b-0 border-slate-200 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {isResultsPage && (
                            <button 
                                onClick={() => setCurrentView('home')}
                                className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-500 dark:text-slate-400"
                                title="Back to Home"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <span className="text-white font-bold text-lg">S</span>
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold gradient-text leading-none">StoryArc AI</h1>
                                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Episodic Intelligence Engine</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-3">
                        <a href="https://github.com/bhavyashah/StoryArc-AI" target="_blank" rel="noopener noreferrer" className="hidden sm:flex px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                            GitHub
                        </a>
                        <button onClick={() => setShowDocs(true)} className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition">
                            Docs
                        </button>
                        <button onClick={() => setShowGuide(true)} className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition">
                            Guide
                        </button>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300 ml-1"
                            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {darkMode ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

function HomePage(props) {
    const { formData, setFormData, handleSubmit, loading, sessions, loadSession } = props;
    return (
        <div className="w-full">
            <DocsModal isOpen={props.showDocs} onClose={() => props.setShowDocs(false)} />
            <GuideModal isOpen={props.showGuide} onClose={() => props.setShowGuide(false)} />
            
            <Header {...props} />

            <section className="pt-24 pb-16 px-4 animate-fade-in-up">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-slate-900 dark:text-white">
                        Turn Your Story into <br/>
                        <span className="gradient-text">Engaging Vertical Series</span>
                    </h2>
                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        AI-powered narrative intelligence: character development, visual mood boards, dialogue suggestions, music recommendations, and shot composition—all in one platform.
                    </p>
                </div>
            </section>

            <section className="pb-24 px-4">
                <div className="max-w-3xl mx-auto animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                    <div className="glass-card rounded-3xl p-6 sm:p-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
                        
                        <h3 className="text-2xl font-bold mb-8 text-slate-900 dark:text-white">Create Your Series</h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div>
                                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Your Story Idea</label>
                                <textarea
                                    value={formData.core_idea}
                                    onChange={(e) => setFormData({...formData, core_idea: e.target.value})}
                                    placeholder="Describe the core concept for your vertical series (90-second episodes)... e.g. 'A cyberpunk chef tries to save her family restaurant using illegal synth-ingredients.'"
                                    className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-36 resize-none transition-shadow"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-2 text-slate-500 uppercase tracking-wider">Episodes</label>
                                    <select
                                        value={formData.episode_count}
                                        onChange={(e) => setFormData({...formData, episode_count: parseInt(e.target.value)})}
                                        className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-shadow cursor-pointer appearance-none"
                                    >
                                        {[5,6,7,8].map(n => <option key={n} value={n}>{n} Eps</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-2 text-slate-500 uppercase tracking-wider">Genre</label>
                                    <select
                                        value={formData.genre}
                                        onChange={(e) => setFormData({...formData, genre: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-shadow cursor-pointer appearance-none"
                                    >
                                        <option>Drama</option>
                                        <option>Comedy</option>
                                        <option>Thriller</option>
                                        <option>Romance</option>
                                        <option>Sci-Fi</option>
                                        <option>Fantasy</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-2 text-slate-500 uppercase tracking-wider">Tone</label>
                                    <select
                                        value={formData.tone}
                                        onChange={(e) => setFormData({...formData, tone: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-shadow cursor-pointer appearance-none"
                                    >
                                        <option>Dramatic</option>
                                        <option>Light-hearted</option>
                                        <option>Suspenseful</option>
                                        <option>Romantic</option>
                                        <option>Adventurous</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-2 text-slate-500 uppercase tracking-wider">Audience</label>
                                    <select
                                        value={formData.target_audience}
                                        onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-shadow cursor-pointer appearance-none"
                                    >
                                        <option>13-17</option>
                                        <option>18-35</option>
                                        <option>35-50</option>
                                        <option>50+</option>
                                        <option>All Ages</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 hover:opacity-90 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-300 mt-4 animate-scale-up"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Engine Running...
                                    </span>
                                ) : (
                                    'Generate Series Analysis ✨'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            {sessions.length > 0 && <SessionHistory sessions={sessions} loadSession={loadSession} />}

            <section className="py-24 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-darkCard/50">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16 animate-fade-in-up">
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Everything you need to pitch and produce</h3>
                        <p className="text-slate-600 dark:text-slate-400">Comprehensive AI analysis tailored for vertical short-form content.</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard icon="📊" title="Emotional Arcs" desc="Interactive charts predicting viewer retention, cliffhanger strength, and flat zones." delay="0s" />
                        <FeatureCard icon="🎬" title="Shot Composition" desc="Specific camera angles, movements, and DoF recommendations for every scene." delay="0.1s" />
                        <FeatureCard icon="🎨" title="Visual Mood Boards" desc="Color palettes, lighting design, and VFX suggestions to build your aesthetic." delay="0.2s" />
                        <FeatureCard icon="👥" title="Character Arcs" desc="Deep behavioral profiles, archetype matching, and ensemble dynamics." delay="0.3s" />
                        <FeatureCard icon="🎵" title="Sound Design" desc="BPM matching, thematic background genres, and specific SFX cues." delay="0.4s" />
                        <FeatureCard icon="⚡" title="Risk Prediction" desc="Identify exactly where viewers might swipe away and how to fix the pacing." delay="0.5s" />
                    </div>
                </div>
            </section>

            <footer className="py-8 text-center border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm">
                <p>StoryArc AI 2.0 | Built with ❤️ for creators everywhere</p>
                <p className="mt-1 text-xs opacity-70">Powered by Google Gemini AI</p>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc, delay }) {
    return (
        <div 
            className="glass-card rounded-2xl p-6 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 animate-fade-in-up hover:animate-glow-pulse border border-transparent hover:border-primary/50"
            style={{ animationDelay: delay }}
        >
            <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-2xl mb-4 border border-primary/20 animate-bounce-in">
                {icon}
            </div>
            <h4 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{title}</h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}

function SessionHistory({ sessions, loadSession }) {
    return (
        <section className="py-24 px-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-darkBg border-t border-slate-200 dark:border-slate-800">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12 animate-fade-in-up">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Recent Analyses</h3>
                    <p className="text-slate-600 dark:text-slate-400">Your session history - click to reload</p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {sessions.map((session, idx) => (
                        <div 
                            key={session.id} 
                            onClick={() => loadSession(session.data)}
                            className="glass-card rounded-2xl p-4 cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-300 animate-bounce-in border border-cyan-500/20 hover:border-cyan-500/50 animate-scale-up"
                            style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 mb-2">{session.title}</h4>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-md font-medium">{session.genre}</span>
                                        <span className="text-xs px-2 py-1 bg-secondary/20 text-secondary rounded-md font-medium">{session.episodes} eps</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{session.timestamp}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function DocsModal({ isOpen, onClose }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up" style={{animationDuration: '0.2s'}} onClick={onClose}>
            <div className="bg-white dark:bg-darkCard w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Documentation</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-6 text-slate-600 dark:text-slate-300">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Getting Started</h3>
                            <p className="mb-2">StoryArc AI transforms your story ideas into fully analyzed vertical series (optimized for TikTok, Reels, Shorts). Here's how:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Enter your story concept (aim for 90-second episodes).</li>
                                <li>Choose genre, tone, and target audience.</li>
                                <li>AI analyzes and generates structured episode breakdowns.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">API Endpoints</h3>
                            <code className="block bg-slate-100 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-mono text-primary mb-2">POST /api/analyse</code>
                            <p className="text-sm">Expects a JSON payload matching the form fields. Returns a structured JSON response containing the full narrative analysis.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function GuideModal({ isOpen, onClose }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up" style={{animationDuration: '0.2s'}} onClick={onClose}>
            <div className="bg-white dark:bg-darkCard w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Quick Start Guide</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    {[
                        { step: 1, title: 'Write Your Story', desc: 'Describe the core concept of your vertical series. Include main characters, plot hooks, and the overall arc you want to explore.', color: 'text-primary', bg: 'bg-primary/10' },
                        { step: 2, title: 'Choose Settings', desc: 'Select the number of episodes (5-8), genre, tone, and audience to tailor the analysis.', color: 'text-secondary', bg: 'bg-secondary/10' },
                        { step: 3, title: 'Generate', desc: 'Click the generate button and wait 30-90 seconds for the AI to deeply analyze your narrative.', color: 'text-pink-500', bg: 'bg-pink-500/10' },
                        { step: 4, title: 'Explore Insights', desc: 'Review the 6 tabs generated to construct your pitch deck or production plan.', color: 'text-green-500', bg: 'bg-green-500/10' }
                    ].map((item, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-4 ${item.bg}`}>
                            <div className={`font-bold ${item.color} text-xl shrink-0`}>0{item.step}</div>
                            <div>
                                <h4 className={`font-bold ${item.color} mb-1`}>{item.title}</h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ResultsPage(props) {
    const { data, darkMode } = props;
    const [activeTab, setActiveTab] = useState('overview');
    const tabs = ['overview', 'episodes', 'characters', 'visuals', 'music', 'shots'];
    
    return (
        <div className="w-full">
            <DocsModal isOpen={props.showDocs} onClose={() => props.setShowDocs(false)} />
            <GuideModal isOpen={props.showGuide} onClose={() => props.setShowGuide(false)} />
            
            <Header {...props} isResultsPage={true} />

            <div className="sticky top-[73px] sm:top-[85px] z-40 bg-white/80 dark:bg-darkBg/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-2 sm:gap-6 overflow-x-auto hide-scrollbar pt-2">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold text-sm sm:text-base transition-all whitespace-nowrap border-b-2 ${
                                    activeTab === tab 
                                        ? 'border-primary text-primary dark:text-primary' 
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 animate-fade-in-up">
                {activeTab === 'overview' && <OverviewTab data={data} darkMode={darkMode} />}
                {activeTab === 'episodes' && <EpisodesTab data={data} />}
                {activeTab === 'characters' && <CharactersTab data={data} />}
                {activeTab === 'visuals' && <VisualsTab data={data} />}
                {activeTab === 'music' && <MusicTab data={data} />}
                {activeTab === 'shots' && <ShotsTab data={data} />}
            </div>
        </div>
    );
}

function OverviewTab({ data, darkMode }) {
    const series = data.series;
    const metrics = data.engine_metrics;
    
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="glass-card rounded-3xl p-6 sm:p-10">
                <h3 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900 dark:text-white">{series.series_title}</h3>
                <p className="text-slate-600 dark:text-slate-300 text-lg mb-8 max-w-4xl leading-relaxed">{series.series_logline}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Episodes" value={series.total_episodes} icon="📱" />
                    <StatCard label="Avg Cliffhanger" value={`${Math.round(metrics.avg_cliffhanger_strength || 0)}/10`} icon="⚡" color="text-yellow-500" />
                    <StatCard label="High Risk Zones" value={metrics.high_risk_segments || 0} icon="⚠️" color="text-red-500" />
                    <StatCard label="Flat Warnings" value={metrics.flat_zone_warnings || 0} icon="📉" color="text-orange-500" />
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-card rounded-2xl p-6">
                    <h4 className="font-bold mb-6 text-slate-900 dark:text-white text-lg">Emotional Arc Distribution</h4>
                    <EmotionalArcChart episodes={series.episodes} darkMode={darkMode} />
                </div>
                <div className="glass-card rounded-2xl p-6">
                    <h4 className="font-bold mb-6 text-slate-900 dark:text-white text-lg">Retention Risk Timeline</h4>
                    <RiskPredictionChart episodes={series.episodes} darkMode={darkMode} />
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color = "text-primary" }) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-start mb-2">
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold uppercase tracking-wider">{label}</p>
                <span className="text-lg">{icon}</span>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</p>
        </div>
    );
}

function EpisodesTab({ data }) {
    const episodes = data.series?.episodes || [];
    return (
        <div className="w-full animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {episodes.map((ep, idx) => (
                    <EpisodeFlashCard key={idx} episode={ep} index={idx} />
                ))}
            </div>
        </div>
    );
}

function EpisodeFlashCard({ episode, index }) {
    const [flipped, setFlipped] = useState(false);
    
    return (
        <div 
            className="h-72 cursor-pointer perspective animate-flip-in"
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => setFlipped(!flipped)}
        >
            <div className="relative w-full h-full transition-transform duration-500" style={{
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}>
                {/* Front of card */}
                <div 
                    className="absolute w-full h-full glass-card rounded-3xl p-6 flex flex-col justify-between"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <div>
                        <span className="inline-block bg-primary/20 text-primary px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-3">Episode {episode.episode_number}</span>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 line-clamp-2">{episode.episode_title}</h3>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Cliffhanger</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-primary to-secondary h-full rounded-full"
                                        style={{ width: `${(episode.cliffhanger_scoring?.strength_score || 0) * 10}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm font-bold text-primary">{episode.cliffhanger_scoring?.strength_score || 0}/10</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Click to flip for more details →</p>
                    </div>
                </div>

                {/* Back of card */}
                <div 
                    className="absolute w-full h-full glass-card rounded-3xl p-6 overflow-y-auto flex flex-col justify-between"
                    style={{ 
                        backfaceVisibility:'hidden',
                        transform: 'rotateY(180deg)'
                    }}
                >
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Synopsis</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-4">{episode.narrative_breakdown}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {(episode.emotional_arc_analysis || []).slice(0, 2).map((arc, idx) => (
                                <div key={idx} className="bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-2">
                                    <p className="text-xs font-mono text-primary mb-1">{arc.time_block}</p>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{arc.dominant_emotion}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">← Click to flip back</p>
                </div>
            </div>
        </div>
    );
}

function CharactersTab({ data }) {
    const characters = data.character_development?.characters || [];
    if (characters.length === 0) return <div className="text-center py-12 text-slate-500">Character data not available.</div>;
    
    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
            {characters.map((char, idx) => (
                <div 
                    key={idx} 
                    className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-transform animate-slide-in-left hover:shadow-xl hover:animate-glow-pulse border border-transparent hover:border-secondary/50"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white">{char.name}</h4>
                            <span className="text-sm font-medium text-secondary">{char.archetype}</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Background</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{char.background}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Arc</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{char.character_arc}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Traits</p>
                            <div className="flex flex-wrap gap-2">
                                {(char.traits || []).map((trait, tIdx) => (
                                    <span key={tIdx} className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-md font-medium hover:bg-secondary/20 transition-colors">{trait}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function VisualsTab({ data }) {
    const visuals = data.visual_mood_board;
    if (!visuals) return <div className="text-center py-12 text-slate-500">Visual data not available.</div>;
    
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <div className="glass-card rounded-3xl p-8">
                <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Aesthetic & Mood Board</h3>
                
                <div className="mb-8">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Color Palette</h4>
                    <div className="flex flex-wrap gap-4 mb-4">
                        {(visuals.color_palette?.primary || []).map((color, idx) => (
                            <div 
                                key={idx} 
                                className="group relative animate-bounce-in"
                                style={{ animationDelay: `${idx * 0.1}s` }}
                            >
                                <div 
                                    className="w-16 h-16 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:animate-glow-pulse" 
                                    style={{backgroundColor: color}}
                                ></div>
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">{color}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{visuals.color_palette?.reasoning || ''}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-colors animate-slide-in-left">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Camera Style</h4>
                        <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{visuals.camera_style || ''}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-colors animate-slide-in-right">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Lighting Design</h4>
                        <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{visuals.lighting_design || ''}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MusicTab({ data }) {
    const music = data.music_recommendations;
    if (!music) return <div className="text-center py-12 text-slate-500">Music data not available.</div>;
    
    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
            <div className="glass-card rounded-2xl p-8 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 animate-bounce-in">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl animate-pulse-slow">🎵</div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Opening Theme</h3>
                        <p className="text-sm text-slate-500">{music.opening_theme?.genre} • {music.opening_theme?.tempo_bpm} BPM</p>
                    </div>
                </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6">
                <div className="glass-card rounded-2xl p-6 animate-slide-in-left">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Background Tracks</h4>
                    <div className="space-y-4">
                        {(music.background_music || []).map((bg, idx) => (
                            <div key={idx} className="pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0 hover:bg-slate-100/20 dark:hover:bg-slate-800/20 p-2 rounded transition-colors">
                                <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">{bg.emotion}</p>
                                <p className="text-sm text-slate-500 mb-2">{bg.genre}</p>
                                <div className="flex flex-wrap gap-2">
                                    {(bg.reference_artists || []).map((artist, aIdx) => (
                                        <span key={aIdx} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 hover:bg-primary/30 transition-colors">Ref: {artist}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="glass-card rounded-2xl p-6">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Sound Effects</h4>
                        <div className="flex flex-wrap gap-2">
                            {(music.sound_effects || []).map((sfx, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-lg text-sm font-medium">{sfx}</span>
                            ))}
                        </div>
                    </div>
                    <div className="glass-card rounded-2xl p-6">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Pacing & Silence</h4>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            {(music.silence_placement || []).map((plc, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">⏸</span> {plc}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShotsTab({ data }) {
    const shots = data.shot_composition;
    if (!shots) return <div className="text-center py-12 text-slate-500">Shot composition data not available.</div>;
    
    return (
        <div className="max-w-5xl mx-auto animate-fade-in-up">
            <div className="grid gap-4">
                {(shots.shot_breakdown || []).map((shot, idx) => (
                    <div 
                        key={idx} 
                        className="glass-card rounded-xl p-5 md:p-6 flex flex-col md:flex-row gap-6 hover:shadow-xl hover:-translate-y-1 transition-all animate-slide-in-left border border-transparent hover:border-primary/30"
                        style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                        <div className="shrink-0 w-full md:w-32">
                            <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mb-2">{shot.time_block}</span>
                            <h4 className="font-bold text-primary dark:text-primary">{shot.shot_type}</h4>
                        </div>
                        <div className="flex-grow">
                            <p className="text-slate-700 dark:text-slate-200 mb-4 font-medium">{shot.purpose}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Movement</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">{shot.camera_movement}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Framing</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">{shot.framing}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Depth</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">{shot.depth_of_field}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Focus</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">{shot.focus_pulling}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmotionalArcChart({ episodes, darkMode }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const textColor = darkMode ? '#cbd5e1' : '#475569';

    useEffect(() => {
        if (!chartRef.current || !episodes.length) return;
        const ctx = chartRef.current.getContext('2d');
        
        const emotionCounts = {};
        episodes.forEach(ep => {
            ep.emotional_arc_analysis?.forEach(arc => {
                const emotion = arc.dominant_emotion || 'Unknown';
                emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
            });
        });

        const colors = ['#6366f1', '#a855f7', '#ec4899', '#f97316', '#eab308', '#22c55e'];
        
        if (chartInstance.current) chartInstance.current.destroy();

        chartInstance.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(emotionCounts),
                datasets: [{
                    data: Object.values(emotionCounts),
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textColor, font: { family: "'Inter', sans-serif" } }
                    }
                }
            }
        });

        return () => chartInstance.current?.destroy();
    }, [episodes, darkMode]);

    return <div className="w-full max-w-[300px] mx-auto"><canvas ref={chartRef}></canvas></div>;
}

function RiskPredictionChart({ episodes, darkMode }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const textColor = darkMode ? '#cbd5e1' : '#475569';
    const gridColor = darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    useEffect(() => {
        if (!chartRef.current || !episodes.length) return;
        const ctx = chartRef.current.getContext('2d');
        
        const labels = episodes.map(ep => `Ep ${ep.episode_number}`);
        const highRisk = [], mediumRisk = [], lowRisk = [];

        episodes.forEach(ep => {
            let high = 0, medium = 0, low = 0;
            ep.retention_risk_prediction?.forEach(risk => {
                const level = (risk.risk_level || '').toLowerCase();
                if (level.includes('high')) high++;
                else if (level.includes('medium')) medium++;
                else low++;
            });
            highRisk.push(high);
            mediumRisk.push(medium);
            lowRisk.push(low);
        });

        if (chartInstance.current) chartInstance.current.destroy();

        chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'High Risk', data: highRisk, backgroundColor: '#ef4444', borderRadius: 4 },
                    { label: 'Medium Risk', data: mediumRisk, backgroundColor: '#f97316', borderRadius: 4 },
                    { label: 'Low Risk', data: lowRisk, backgroundColor: '#22c55e', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                stacked: true,
                plugins: {
                    legend: { labels: { color: textColor, font: { family: "'Inter', sans-serif" } } }
                },
                scales: {
                    x: { stacked: true, ticks: { color: textColor }, grid: { color: gridColor, drawBorder: false } },
                    y: { stacked: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor, drawBorder: false } }
                }
            }
        });

        return () => chartInstance.current?.destroy();
    }, [episodes, darkMode]);

    return <canvas ref={chartRef}></canvas>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
