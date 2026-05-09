import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

export default function Verify() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your subscription...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + `/api/verify/${token}`, {
          method: 'POST'
        });
        const data = await response.json();
        
        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link might be invalid or expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error. Please try again later.');
      }
    };

    if (token) {
      verifyEmail();
    }
  }, [token]);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 text-center">
      {/* Absolute Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-30 z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent-glow blur-[100px] rounded-full pointer-events-none z-0 opacity-50"></div>

      <div className="relative z-10 glass-panel p-8 rounded-2xl max-w-md w-full border border-white/10 flex flex-col items-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-primary mb-2">Almost there!</h2>
            <p className="text-secondary">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">Verified!</h2>
            <p className="text-secondary mb-8">{message}</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-white text-background px-6 py-3 rounded-xl font-medium hover:bg-zinc-200 transition-colors">
              Return Home <ArrowRight size={18} />
            </Link>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-6">
              <XCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">Verification Failed</h2>
            <p className="text-secondary mb-8">{message}</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-white text-background px-6 py-3 rounded-xl font-medium hover:bg-zinc-200 transition-colors">
              Return Home <ArrowRight size={18} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
