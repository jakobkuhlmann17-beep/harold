import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#fcf9f8]/80 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <span className="font-headline text-xl font-bold gradient-text">Harold</span>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-headline font-medium text-on-surface-variant hover:text-primary transition-colors">Workouts</a>
            <a href="#nutrition" className="text-sm font-headline font-medium text-on-surface-variant hover:text-primary transition-colors">Nutrition</a>
            <a href="#ai" className="text-sm font-headline font-medium text-on-surface-variant hover:text-primary transition-colors">Trends</a>
            <a href="#community" className="text-sm font-headline font-medium text-on-surface-variant hover:text-primary transition-colors">Community</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-headline font-medium text-on-surface-variant hover:text-primary transition-colors">Sign in</Link>
            <Link to="/register" className="hearth-glow text-white rounded-full px-5 py-2 text-sm font-headline font-semibold hover:opacity-90 transition-opacity">Join Harold</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#fcf9f8] via-[#fcf9f8]/60 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32">
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter text-on-surface leading-[0.95]">
            Ignite Your<br /><span className="text-primary">Potential</span>
          </h1>
          <p className="mt-6 text-lg text-on-surface-variant font-body max-w-lg leading-relaxed">
            Harold is your AI-powered workout companion. Track lifts, fuel your body, and let intelligent coaching push you further every week.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/register" className="hearth-glow text-white rounded-full px-8 py-3.5 font-headline font-bold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">bolt</span>
              Start Your Journey
            </Link>
            <Link to="/login" className="bg-surface-container-high text-on-surface rounded-full px-8 py-3.5 font-headline font-bold text-sm hover:bg-surface-container-highest transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Bento */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Workout tracking card */}
          <div className="md:col-span-7 bg-surface-container-low rounded-xl p-8">
            <p className="text-xs font-label uppercase tracking-widest text-primary font-bold mb-2">Performance</p>
            <h3 className="font-headline text-2xl font-bold text-on-surface mb-2">Intelligent Tracking</h3>
            <p className="text-sm text-on-surface-variant font-body mb-6 max-w-md">Log every set, rep, and kilogram. Harold organises your workout week and tracks progressive overload across all muscle groups.</p>
            {/* Mock workout card */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
              <div className="border-l-4 border-l-primary p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-headline font-bold text-on-surface">Barbells</span>
                  <span className="material-symbols-outlined filled text-primary text-[20px]">check_circle</span>
                </div>
                <div className="flex gap-4 text-sm text-on-surface-variant font-body">
                  <span>8 reps @ 28kg</span><span>7 reps @ 28kg</span><span>6 reps @ 28kg</span>
                </div>
              </div>
              <div className="border-l-4 border-l-tertiary p-4 border-t border-outline-variant/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-headline font-bold text-on-surface">Cable Chest</span>
                  <span className="material-symbols-outlined text-outline-variant text-[20px]">radio_button_unchecked</span>
                </div>
                <div className="flex gap-4 text-sm text-on-surface-variant font-body">
                  <span>10 reps @ 18.5kg</span><span>10 reps @ 18.5kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nutrition card */}
          <div id="nutrition" className="md:col-span-5 bg-surface-container-high rounded-xl p-8">
            <p className="text-xs font-label uppercase tracking-widest text-tertiary font-bold mb-2">Nourishment</p>
            <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">Nutritional Harmony</h3>
            {/* SVG ring */}
            <div className="flex justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <defs><linearGradient id="landingCalGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a14000" /><stop offset="100%" stopColor="#f26d21" /></linearGradient></defs>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e4e2e1" strokeWidth="8" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="url(#landingCalGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 50} strokeDashoffset={2 * Math.PI * 50 * 0.08} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline text-xl font-black text-on-surface">1,840</span>
                  <span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant">kcal left</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="font-headline font-black text-lg text-tertiary">142g</p><p className="text-[10px] font-label text-on-surface-variant">Protein</p></div>
              <div><p className="font-headline font-black text-lg text-secondary">210g</p><p className="text-[10px] font-label text-on-surface-variant">Carbs</p></div>
              <div><p className="font-headline font-black text-lg text-primary">54g</p><p className="text-[10px] font-label text-on-surface-variant">Fats</p></div>
            </div>
          </div>

          {/* Community card */}
          <div id="community" className="md:col-span-12 bg-surface-container rounded-xl p-8">
            <p className="text-xs font-label uppercase tracking-widest text-secondary font-bold mb-2">Connection</p>
            <h3 className="font-headline text-2xl font-bold text-on-surface mb-2">The Daily Pulse</h3>
            <p className="text-sm text-on-surface-variant font-body mb-6 max-w-xl">Share victories, exchange tips, and stay accountable with a community that fuels your fire.</p>
            <div className="flex flex-wrap items-center gap-6">
              {/* Overlapping avatars */}
              <div className="flex -space-x-3">
                {['JK', 'DM', 'AL'].map((initials) => (
                  <div key={initials} className="w-10 h-10 rounded-full hearth-glow flex items-center justify-center text-white text-xs font-bold font-headline border-2 border-surface-container">{initials}</div>
                ))}
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold font-headline text-on-surface-variant border-2 border-surface-container">+8k</div>
              </div>
              <div className="flex gap-4">
                <div className="bg-surface-container-lowest rounded-xl px-4 py-3">
                  <p className="font-headline font-black text-primary text-lg">12% <span className="text-xs text-on-surface-variant font-label">&uarr;</span></p>
                  <p className="text-[10px] font-label text-on-surface-variant">Strength Trend</p>
                </div>
                <div className="bg-surface-container-lowest rounded-xl px-4 py-3">
                  <p className="font-headline font-black text-secondary text-lg">14</p>
                  <p className="text-[10px] font-label text-on-surface-variant">Day Active Streak</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="ai" className="py-24 px-6 max-w-7xl mx-auto">
        <p className="text-xs font-label uppercase tracking-widest text-primary font-bold mb-2">Intelligence</p>
        <h3 className="font-headline text-3xl lg:text-4xl font-bold text-on-surface mb-3">Your AI-Powered Coach</h3>
        <p className="text-on-surface-variant font-body max-w-2xl mb-8 leading-relaxed">
          Harold uses Claude AI to analyze your workout feedback and automatically generate the next week's progressive overload plan &mdash; personalised to how each set felt.
        </p>
        <div className="flex flex-wrap gap-3 mb-10">
          {['Reads your set feedback', 'Applies progressive overload science', 'Generates Week N+1 automatically'].map((t) => (
            <span key={t} className="bg-primary-fixed text-primary text-xs font-label font-bold rounded-full px-4 py-2">{t}</span>
          ))}
        </div>
        {/* Mock feedback card */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm max-w-lg">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chat_bubble</span>
            </div>
            <div className="bg-surface-container-low rounded-xl px-4 py-3 flex-1">
              <p className="text-xs font-label text-outline mb-1">Set feedback</p>
              <p className="text-sm font-body text-on-surface italic">"left shoulder felt tight on last set"</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full hearth-glow flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white text-[16px]">auto_awesome</span>
            </div>
            <div className="bg-primary-fixed/30 rounded-xl px-4 py-3 flex-1">
              <p className="text-xs font-label text-primary mb-1">Claude AI</p>
              <p className="text-sm font-body text-on-surface">Reduced shoulder press from 20kg &rarr; 17.5kg. Added note: monitor left shoulder. Other exercises progressed normally.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-surface-container-low py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="material-symbols-outlined filled text-primary/20 text-6xl mb-4">format_quote</span>
          <blockquote className="font-headline text-xl lg:text-2xl italic text-on-surface leading-relaxed mb-6">
            "Harold completely changed how I track my fitness. The warm design and AI coaching keep me consistent without the clinical stress of other apps."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full hearth-glow flex items-center justify-center text-white text-sm font-bold font-headline">JK</div>
            <div className="text-left">
              <p className="font-headline font-bold text-sm text-on-surface">Jakob Kuhlmann</p>
              <p className="text-xs text-on-surface-variant font-label">Creator of Harold</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto hearth-glow rounded-[2.5rem] p-10 lg:p-16 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative">
            <div>
              <h3 className="font-headline text-3xl lg:text-4xl font-extrabold text-white leading-tight">Ready to fuel<br />your flame?</h3>
              <p className="mt-4 text-white/80 font-body leading-relaxed">Join thousands of athletes using Harold to build strength, track nutrition, and push beyond their limits.</p>
            </div>
            <div className="space-y-3">
              <input placeholder="Full Name" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-body text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30" readOnly />
              <input placeholder="Email" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-body text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30" readOnly />
              <input placeholder="Password" type="password" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-body text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30" readOnly />
              <Link to="/register" className="w-full bg-white text-primary rounded-full py-3.5 font-headline font-bold text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                Join Harold
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-low py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="font-headline text-xl font-bold text-primary">Harold</span>
            <div className="flex flex-wrap gap-6 text-sm text-on-surface-variant font-body">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
              <a href="#" className="hover:text-primary transition-colors">Instagram</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
          <p className="text-center text-xs text-outline font-label mt-8">&copy; 2026 Harold. Fuel your flame.</p>
        </div>
      </footer>
    </div>
  );
}
