import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav bg-[#fcf9f8]/80 border-b border-outline-variant/20">
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
        <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#fcf9f8] via-[#fcf9f8]/60 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32">
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter text-on-surface leading-[0.95]">
            Ignite Your<br /><span className="text-primary">Potential</span>
          </h1>
          <p className="mt-6 text-xl text-on-surface-variant font-body max-w-lg leading-relaxed">
            Harold is your AI-powered workout companion. Track lifts, fuel your body, and let intelligent coaching push you further every week.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/register" className="hearth-glow text-white rounded-full px-10 py-4 font-headline font-bold text-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">bolt</span>
              Start Your Journey
            </Link>
            <a href="#features" className="bg-surface-container-high text-on-surface rounded-full px-10 py-4 font-headline font-bold text-lg hover:bg-surface-container-highest transition-colors">
              View Methods
            </a>
          </div>
        </div>
      </section>

      {/* AI-Powered Coach Section */}
      <section id="features" className="py-24 px-6 lg:px-8 max-w-7xl mx-auto">
        <p className="uppercase tracking-[0.3em] text-primary font-black text-xs font-label mb-3">Intelligence</p>
        <h2 className="font-headline text-4xl lg:text-5xl font-black text-on-surface mb-3">Meet Your AI-Powered Coach</h2>
        <p className="text-xl text-on-surface-variant font-body max-w-2xl mb-12">Harold learns how every set feels and adapts your next week automatically. Progressive overload, personalised.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {/* Card 1 — Precision Logging */}
          <div className="lg:col-span-8 bg-surface-container-low rounded-[2rem] p-8 lg:p-10 ai-pulse-glow border border-primary/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-xs font-label font-bold mb-4">
                <span className="material-symbols-outlined text-[16px]">edit_note</span> Precision Logging
              </span>
              <h3 className="font-headline text-3xl lg:text-4xl font-bold text-on-surface mb-2">Master Your Data</h3>
              <p className="text-on-surface-variant font-body mb-6 max-w-md">Every rep, every kilogram, every feeling. Harold captures the full picture so your AI coach can make smarter decisions.</p>

              {/* Mock workout card */}
              <div className="bg-surface-container-lowest/80 rounded-2xl p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[20px]">fitness_center</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-headline font-bold text-on-surface">Morning Strength Flow</p>
                  </div>
                  <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold font-label px-2.5 py-1 rounded-full uppercase tracking-wider">In Progress</span>
                </div>
                {/* Exercise 1 — completed */}
                <div className="flex items-center gap-3 py-3 border-t border-outline-variant/10">
                  <div className="w-1 h-10 rounded-full hearth-glow" />
                  <div className="flex-1">
                    <p className="font-headline font-bold text-sm text-on-surface">Goblet Squats</p>
                    <p className="text-xs text-on-surface-variant font-body">3 Sets &bull; 12 Reps &bull; 24kg</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-label font-bold text-secondary uppercase">Personal Best</span>
                    <span className="material-symbols-outlined filled text-secondary text-[20px]">check_circle</span>
                  </div>
                </div>
                {/* Exercise 2 — upcoming */}
                <div className="flex items-center gap-3 py-3 border-t border-outline-variant/10 opacity-60">
                  <div className="w-1 h-10 rounded-full bg-outline-variant" />
                  <div className="flex-1">
                    <p className="font-headline font-bold text-sm text-on-surface">Lateral Lunges</p>
                    <p className="text-xs text-on-surface-variant font-body">Up Next &bull; 3 Sets &bull; 10 Reps</p>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant text-[20px]">radio_button_unchecked</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 — Community Flow */}
          <div id="community" className="lg:col-span-4 bg-tertiary-fixed rounded-[2rem] p-8 border border-outline-variant/10 relative overflow-hidden">
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-tertiary/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative">
              <span className="material-symbols-outlined text-tertiary text-[28px] mb-3">groups</span>
              <h3 className="font-headline text-2xl font-bold text-on-surface mb-2">Community Flow</h3>
              <p className="text-sm font-body text-on-surface-variant mb-5">See what others are training. Share wins, get inspired, stay accountable.</p>
              <div className="space-y-2">
                <div className="bg-white/40 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full hearth-glow flex items-center justify-center text-white text-[10px] font-bold font-headline flex-shrink-0">SJ</div>
                  <p className="text-xs font-body text-on-surface flex-1"><span className="font-bold">Sarah J.</span> logged Morning Peak &bull; 32 mins &bull; 412 kcal &bull; 12 sets</p>
                  <span className="material-symbols-outlined text-primary text-[16px]">favorite</span>
                </div>
                <div className="bg-white/40 rounded-xl p-3 flex items-center gap-2.5 opacity-60">
                  <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container text-[10px] font-bold font-headline flex-shrink-0">ML</div>
                  <p className="text-xs font-body text-on-surface flex-1"><span className="font-bold">Marcus L.</span> started a session &bull; Heavy Compound Push Day</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 — Predictive Recovery */}
          <div className="lg:col-span-4 bg-surface-container-high rounded-[2rem] p-8">
            <span className="material-symbols-outlined text-primary text-[28px] mb-3">hourglass_empty</span>
            <h3 className="font-headline text-2xl font-bold text-on-surface mb-2">Predictive Recovery</h3>
            <p className="text-sm font-body text-on-surface-variant mb-5">Smart readiness scoring based on your training load, sleep, and recovery signals.</p>
            <div className="bg-surface-container-lowest p-5 rounded-2xl">
              <div className="flex items-center gap-4 mb-3">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="18" fill="none" stroke="#e4e2e1" strokeWidth="5" />
                    <circle cx="24" cy="24" r="18" fill="none" stroke="#8f4e00" strokeWidth="5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 18} strokeDashoffset={2 * Math.PI * 18 * 0.22} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-headline text-xs font-black text-on-surface">78%</span>
                </div>
                <div>
                  <p className="font-headline font-bold text-sm text-on-surface">Readiness Score</p>
                  <p className="text-xs text-tertiary font-label">Lighter session advised</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full bg-surface-container-high rounded-full h-1.5">
                  <div className="bg-secondary h-1.5 rounded-full w-2/3" />
                </div>
                <div className="flex justify-between text-[10px] font-label text-on-surface-variant">
                  <span>CNS Fatigue</span><span>Moderate</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4 — Nutrition Intelligence */}
          <div id="ai" className="lg:col-span-8 bg-secondary-fixed rounded-[2rem] p-8 border border-secondary/10 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-secondary text-[22px]">restaurant</span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-2">Nutrition Intelligence</h3>
                <p className="text-sm font-body text-on-surface-variant mb-4">AI-matched meal suggestions based on your training intensity and macro targets.</p>
                <span className="text-sm text-secondary font-headline font-bold cursor-pointer hover:underline">See Today's Menu &rarr;</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/40 rounded-2xl p-4 col-span-2 md:col-span-1">
                  <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80" alt="food" className="w-full h-24 object-cover rounded-xl mb-2" />
                  <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Post-Workout Fuel</p>
                  <p className="font-headline font-bold text-sm text-on-surface">Quinoa &amp; Harissa Salmon</p>
                </div>
                <div className="bg-white/40 rounded-2xl p-4 flex flex-col justify-center col-span-2 md:col-span-1">
                  <p className="font-headline text-2xl font-black text-secondary">+15g</p>
                  <p className="font-headline font-bold text-sm text-on-surface mt-1">Carb Surplus Suggested</p>
                  <p className="text-xs text-on-surface-variant font-body mt-1">Based on Leg Day intensity</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Insights */}
      <section id="nutrition" className="py-24 px-6 lg:px-8 max-w-7xl mx-auto border-t border-outline-variant/10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Nutritional Harmony */}
          <div className="md:col-span-6 bg-surface-container-low rounded-xl p-8">
            <p className="text-xs font-label uppercase tracking-widest text-tertiary font-bold mb-2">Nourishment</p>
            <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">Nutritional Harmony</h3>
            <div className="flex justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <defs><linearGradient id="lCalGrad2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8f4e00" /><stop offset="100%" stopColor="#de7c00" /></linearGradient></defs>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e4e2e1" strokeWidth="8" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="url(#lCalGrad2)" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 50} strokeDashoffset={2 * Math.PI * 50 * 0.08} />
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

          {/* The Daily Pulse */}
          <div className="md:col-span-6 bg-surface-container rounded-xl p-8">
            <p className="text-xs font-label uppercase tracking-widest text-secondary font-bold mb-2">Connection</p>
            <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">The Daily Pulse</h3>
            <div className="flex gap-4 mb-5">
              <div className="bg-surface-container-lowest rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
                <div><p className="font-headline font-black text-primary text-lg">12% &uarr;</p><p className="text-[10px] font-label text-on-surface-variant">Strength Trend</p></div>
              </div>
              <div className="bg-surface-container-lowest rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">local_fire_department</span>
                <div><p className="font-headline font-black text-secondary text-lg">14</p><p className="text-[10px] font-label text-on-surface-variant">Day Active Streak</p></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {['JK', 'DM', 'AL'].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full hearth-glow flex items-center justify-center text-white text-xs font-bold font-headline border-2 border-surface-container">{i}</div>
                ))}
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold font-headline text-on-surface-variant border-2 border-surface-container">+8k</div>
              </div>
              <p className="text-xs text-on-surface-variant font-label">Active Today</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-surface-container-low py-24 px-6 relative overflow-hidden">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-secondary/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <span className="material-symbols-outlined filled text-primary/20 text-6xl mb-4">format_quote</span>
          <blockquote className="font-headline text-xl lg:text-2xl italic text-on-surface leading-relaxed mb-6">
            "Harold completely changed how I view my fitness. The AI coaching feels intuitive and supportive &mdash; it's like having a world-class trainer who truly understands my body's rhythm."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full hearth-glow flex items-center justify-center text-white text-sm font-bold font-headline">SJ</div>
            <div className="text-left">
              <p className="font-headline font-bold text-sm text-on-surface">Sarah Jenkins</p>
              <p className="text-xs text-primary font-label uppercase tracking-widest">Marathon Runner &amp; Architect</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto hearth-glow rounded-[2.5rem] p-10 md:p-20 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative">
            <div>
              <h3 className="font-headline text-4xl lg:text-5xl font-black text-on-primary leading-tight">Ready to fuel<br />your flame?</h3>
              <p className="mt-4 text-white/80 font-body text-lg leading-relaxed">Join thousands of athletes using Harold to build strength, track nutrition, and push beyond their limits.</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-8 space-y-3">
              <div>
                <label className="text-xs text-white/60 font-label uppercase tracking-widest mb-1 block">Full Name</label>
                <input placeholder="Enter your name" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-body text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30" readOnly />
              </div>
              <div>
                <label className="text-xs text-white/60 font-label uppercase tracking-widest mb-1 block">Email Address</label>
                <input placeholder="you@example.com" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-body text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30" readOnly />
              </div>
              <Link to="/register" className="w-full bg-on-primary text-primary rounded-full py-3.5 font-headline font-extrabold text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2 mt-2">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                Join Harold
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f6f3f2] py-12 px-6">
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
