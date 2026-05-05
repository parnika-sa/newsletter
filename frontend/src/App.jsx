import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, LineChart, Brain, Shield, ChevronRight } from 'lucide-react'

function App() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: '', message: '' })

    try {
      const response = await fetch('http://localhost:5000/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })
      const data = await response.json()
      
      if (response.ok) {
        setStatus({ type: 'success', message: data.message || 'Welcome aboard! Check your inbox soon.' })
        setEmail('')
        setName('')
      } else {
        setStatus({ type: 'error', message: data.error || 'Something went wrong.' })
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Network error. Please try again later.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Absolute Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-30 z-0"></div>
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent-glow blur-[120px] rounded-full pointer-events-none z-0 animate-pulse-slow"></div>

      {/* Navigation */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-background font-bold text-lg">
            N
          </div>
          <span className="text-xl font-medium tracking-tight text-primary">Neural Automate</span>
        </div>
        <Link 
          to="/admin" 
          className="text-sm font-medium text-secondary hover:text-primary transition-colors flex items-center gap-1 group"
        >
          Author Login <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-24 text-center max-w-5xl mx-auto w-full">
        
        {/* Badge */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm font-medium text-secondary mb-8">
            <Sparkles size={14} className="text-accent-purple" />
            <span>Join 1,000+ smart investors & builders</span>
          </div>
        </div>

        {/* Hero Typography */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <span className="text-gradient">Master the Future of</span><br />
          <span className="text-gradient-accent">Finance & AI.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-secondary max-w-2xl mx-auto mb-12 font-light leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          Actionable insights, market trends, and automation strategies delivered directly to your inbox. No fluff, just pure alpha.
        </p>

        {/* Subscription Form */}
        <div className="w-full max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 glass-panel rounded-xl input-glow transition-all duration-300">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com" 
                  className="w-full bg-transparent py-4 pl-5 pr-4 text-primary placeholder:text-zinc-600 focus:outline-none rounded-xl"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-white hover:bg-zinc-200 text-background font-medium py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 sm:w-auto w-full whitespace-nowrap"
              >
                {loading ? 'Joining...' : 'Subscribe'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>
            
            {status.message && (
              <div className={`p-4 rounded-xl text-sm font-medium text-left transition-all ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {status.message}
              </div>
            )}
          </form>
          <p className="text-xs text-zinc-500 mt-4 font-medium flex items-center justify-center gap-1">
            <Shield size={12} /> We respect your privacy. 1-click unsubscribe.
          </p>
        </div>

        {/* Value Props / Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-24 w-full animate-fade-in-up max-w-3xl mx-auto" style={{ animationDelay: '0.6s' }}>
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-start text-left hover:bg-surfaceHover transition-colors cursor-default group">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <LineChart size={20} className="text-zinc-300" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-primary">Wealth & Web3</h3>
            <p className="text-secondary text-sm leading-relaxed">Discover asymmetric investment opportunities and understand the next massive shifts in digital finance.</p>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-start text-left hover:bg-surfaceHover transition-colors cursor-default group">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Brain size={20} className="text-zinc-300" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-primary">AI Automation</h3>
            <p className="text-secondary text-sm leading-relaxed">Learn how to leverage cutting-edge artificial intelligence to scale your income and reclaim your time.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-zinc-600 text-sm font-medium">
        &copy; {new Date().getFullYear()} Neural Automate. All rights reserved.
      </footer>
    </div>
  )
}

export default App
