import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomerLogin from '../components/auth/CustomerLogin';
import CustomerRegister from '../components/auth/CustomerRegister';

export default function AuthPortal({ initialMode = 'login' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const authSectionRef = useRef(null);

  const [mode, setMode] = useState(() => {
    if (location.pathname === '/register') return 'register';
    return initialMode;
  });

  const scrollToAuth = (targetMode) => {
    if (targetMode) setMode(targetMode);
    authSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAuthSuccess = () => {
    const destination = location.state?.from?.pathname || '/dashboard';
    navigate(destination, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col font-sans selection:bg-orange-500/20 selection:text-orange-300">

      <header className="sticky top-0 z-50 border-b border-[#222222] bg-[#0a0a0a]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-[#ff7849]"></div>
          <span className="font-extrabold tracking-tight text-neutral-100 uppercase text-base">
            AutoQueue
          </span>
          <span className="text-neutral-600 font-mono text-xs">·</span>
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest hidden sm:inline">
            Centralized Vehicle Clearinghouse
          </span>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            type="button"
            onClick={() => scrollToAuth('login')}
            className="px-3.5 py-1.5 text-neutral-300 hover:text-white border border-[#2b2b2b] hover:border-[#ff7849] bg-[#121212] transition-colors duration-150 rounded-[2px]"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => scrollToAuth('register')}
            className="px-3.5 py-1.5 text-neutral-950 font-semibold bg-[#ff7849] hover:bg-[#ff8f66] border border-[#ff7849] transition-colors duration-150 rounded-[2px]"
          >
            Sign Up
          </button>
        </div>
      </header>

      <section className="relative min-h-[92vh] flex flex-col justify-between p-6 sm:p-12 lg:p-16 border-b border-[#1f1f1f] retro-grid">

        <div className="max-w-6xl mx-auto w-full my-auto py-12">

          <div className="inline-flex items-center space-x-2 border border-[#2a2a2a] bg-[#121212] px-3 py-1 mb-8 rounded-[2px] font-mono text-[11px] tracking-widest uppercase">
            <span className="w-2 h-2 bg-[#facc15] inline-block animate-pulse"></span>
            <span className="text-[#facc15]">Customer Portal</span>
            <span className="text-neutral-600">·</span>
            <span className="text-[#38bdf8]">Automotive Queue Protocol</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight uppercase leading-[1.08] mb-6 font-sans">
            <span className="text-neutral-100">One Queue.</span>
            <br />
            <span className="text-[#ff7849]">Multiple Dealers.</span>
            <br />
            <span className="text-[#f43f5e]">Smarter Car Reservations.</span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-400 leading-relaxed max-w-2xl font-sans mb-8">
            Eliminate dealership monopolies. Join a single shared waiting queue,
            receive competitive offers from verified dealers, and confirm your reservation with transparent pricing.
          </p>

          <div className="mb-14">
            <button
              type="button"
              onClick={() => scrollToAuth('login')}
              className="inline-flex items-center space-x-2.5 font-mono text-xs text-[#facc15] hover:text-[#ff8f66] uppercase tracking-widest transition-colors duration-150 py-1.5 group cursor-pointer"
            >
              <span>Scroll to sign in or sign up</span>
              <span className="inline-block transform group-hover:translate-y-1 transition-transform duration-150">
                &darr;
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="border border-[#262626] hover:border-[#facc15]/60 bg-[#0f0f0f] p-5 rounded-[2px] transition-colors duration-150 group">
              <div className="flex items-center justify-between mb-3 font-mono text-xs">
                <span className="text-[#facc15] font-bold">01</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Deposit</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-tight mb-1.5 group-hover:text-white">
                Zero Multi-Deposits
              </h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Register once per model variant. Never lock capital across multiple competing dealerships.
              </p>
            </div>

            <div className="border border-[#262626] hover:border-[#ff7849]/60 bg-[#0f0f0f] p-5 rounded-[2px] transition-colors duration-150 group">
              <div className="flex items-center justify-between mb-3 font-mono text-xs">
                <span className="text-[#ff7849] font-bold">02</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Auction</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-tight mb-1.5 group-hover:text-white">
                Competitive Bidding
              </h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Dealers submit direct price offers against your queue entry as inventory arrives.
              </p>
            </div>

            <div className="border border-[#262626] hover:border-[#f43f5e]/60 bg-[#0f0f0f] p-5 rounded-[2px] transition-colors duration-150 group">
              <div className="flex items-center justify-between mb-3 font-mono text-xs">
                <span className="text-[#f43f5e] font-bold">03</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Contract</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-tight mb-1.5 group-hover:text-white">
                Locked Price Snapshots
              </h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Confirmed reservations generate an irrevocable breakdown with zero surprise add-ons.
              </p>
            </div>

            <div className="border border-[#262626] hover:border-[#38bdf8]/60 bg-[#0f0f0f] p-5 rounded-[2px] transition-colors duration-150 group">
              <div className="flex items-center justify-between mb-3 font-mono text-xs">
                <span className="text-[#38bdf8] font-bold">04</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Security</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-tight mb-1.5 group-hover:text-white">
                Audited Queue Spots
              </h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Cryptographically tracked FIFO waiting order prevents dealer VIP queue-jumping.
              </p>
            </div>

          </div>
        </div>

        <div className="max-w-6xl mx-auto w-full pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between border-t border-[#1a1a1a] text-xs font-mono text-neutral-500">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-none inline-block"></span>
            <span>AutoQueue Customer Terminal</span>
          </div>
          <div className="hidden sm:flex items-center space-x-4 text-[11px] text-neutral-600">
            <span>Protocol v1.0</span>
            <span>·</span>
            <span>REST API Ready</span>
          </div>
        </div>
      </section>

      <section
        id="auth-section"
        ref={authSectionRef}
        className="scroll-mt-16 flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-14 bg-[#0a0a0a]"
      >
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 border border-[#262626] bg-[#0f0f0f] shadow-2xl">

          <div className="lg:col-span-5 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-[#262626] bg-[#0c0c0c] flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center space-x-2 border border-[#222222] bg-[#141414] px-3 py-1 text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-6 rounded-[2px]">
                <span className="w-1.5 h-1.5 bg-[#facc15] animate-pulse"></span>
                <span>System Clearinghouse</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 uppercase font-sans mb-3">
                Customer Terminal
              </h2>

              <p className="text-xs text-neutral-400 leading-relaxed font-sans mb-8">
                Log into your customer account to view your queue positions, inspect incoming dealer bids, and accept confirmed reservation contracts.
              </p>

              <div className="space-y-4 border-t border-[#222222] pt-6 font-mono text-xs">
                <div className="flex items-start space-x-3">
                  <span className="text-[#facc15] font-bold select-none">01</span>
                  <div>
                    <div className="text-neutral-200 uppercase tracking-wide text-[11px] font-semibold">
                      Centralized Waitlists
                    </div>
                    <div className="text-neutral-500 text-[11px] mt-0.5 font-sans">
                      One entry links to all regional dealerships carrying your vehicle model.
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="text-[#ff7849] font-bold select-none">02</span>
                  <div>
                    <div className="text-neutral-200 uppercase tracking-wide text-[11px] font-semibold">
                      Transparent Dealer Offers
                    </div>
                    <div className="text-neutral-500 text-[11px] mt-0.5 font-sans">
                      Compare ex-showroom, insurance, and RTO charges itemized side by side.
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="text-[#f43f5e] font-bold select-none">03</span>
                  <div>
                    <div className="text-neutral-200 uppercase tracking-wide text-[11px] font-semibold">
                      Immediate Booking Lock
                    </div>
                    <div className="text-neutral-500 text-[11px] mt-0.5 font-sans">
                      Accepting an offer immediately confirms vehicle allocation at agreed pricing.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#222222] font-mono text-[10px] text-neutral-500 flex justify-between items-center">
              <span className="text-[#38bdf8]">Role: Customer Portal</span>
              <span className="text-neutral-400">AutoQueue v1.0</span>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 bg-[#121212] flex flex-col justify-center">

            <div className="flex border border-[#262626] bg-[#0c0c0c] p-1 mb-8 max-w-xs rounded-[2px]">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-1.5 px-3 font-mono text-xs uppercase tracking-wider transition-all duration-150 rounded-[2px] ${
                  mode === 'login'
                    ? 'bg-[#ff7849] text-neutral-950 font-bold shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-1.5 px-3 font-mono text-xs uppercase tracking-wider transition-all duration-150 rounded-[2px] ${
                  mode === 'register'
                    ? 'bg-[#ff7849] text-neutral-950 font-bold shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {mode === 'login' ? (
              <CustomerLogin
                onSwitchToRegister={() => setMode('register')}
                onSuccess={handleAuthSuccess}
              />
            ) : (
              <CustomerRegister
                onSwitchToLogin={() => setMode('login')}
                onRegisterSuccess={() => setMode('login')}
              />
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#1f1f1f] bg-[#0a0a0a] px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-neutral-500">
        <div>
          <span>AutoQueue System</span>
        </div>
        <div className="mt-2 sm:mt-0 flex space-x-4">
          <span className="text-neutral-400">Node API: Connected</span>
          <span>&copy; 2026 AutoQueue</span>
        </div>
      </footer>
    </div>
  );
}
