import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MailMinus, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function Unsubscribe() {
  const { token } = useParams();
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleUnsubscribe = async () => {
    setStatus('loading');
    try {
      const response = await fetch(`http://localhost:5000/api/unsubscribe/${token}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'You have been successfully unsubscribed.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to unsubscribe. The link might be invalid.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 text-center">
      {/* Absolute Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-30 z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

      <div className="relative z-10 glass-panel p-8 rounded-2xl max-w-md w-full border border-white/10 flex flex-col items-center">
        {status === 'idle' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-6">
              <MailMinus size={32} />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-4">We hate to see you go!</h2>
            <p className="text-secondary mb-8 leading-relaxed">
              Are you sure you want to unsubscribe from the Neural Automate newsletter? You'll miss out on future insights and market trends.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={handleUnsubscribe}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 rounded-xl font-medium transition-colors"
              >
                Yes, unsubscribe me
              </button>
              <Link to="/" className="w-full bg-white text-background py-3 rounded-xl font-medium hover:bg-zinc-200 transition-colors">
                Never mind, keep me subscribed
              </Link>
            </div>
          </>
        )}

        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-red-400 animate-spin mb-6" />
            <h2 className="text-xl font-bold text-primary mb-2">Processing...</h2>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">Unsubscribed</h2>
            <p className="text-secondary mb-8">{message}</p>
            <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft size={16} /> Return to Home
            </Link>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-6">
              <MailMinus size={32} />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">Oops!</h2>
            <p className="text-secondary mb-8">{message}</p>
            <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft size={16} /> Return to Home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
