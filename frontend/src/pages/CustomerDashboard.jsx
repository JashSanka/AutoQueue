import { useState } from 'react';
import { useAuth } from '../context/useAuth';

export default function CustomerDashboard() {
  const { user, token, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-[#222222] bg-[#0d0d0d] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-neutral-100"></div>
          <span className="font-bold tracking-tight text-neutral-100 uppercase text-sm">
            AutoQueue Console
          </span>
          <span className="text-neutral-600 font-mono text-xs">·</span>
          <span className="text-xs font-mono text-amber-500 uppercase tracking-widest hidden sm:inline">
            Customer Portal
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs text-neutral-200 font-medium">{user?.name}</span>
            <span className="text-[10px] font-mono text-neutral-500">{user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="border border-[#333333] hover:border-red-900/80 bg-[#161616] hover:bg-red-950/20 text-neutral-300 hover:text-red-400 px-3 py-1.5 text-xs font-mono tracking-wider uppercase transition-colors duration-150 rounded-[2px]"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-8">
        
        {/* Welcome Banner */}
        <div className="border border-[#262626] bg-[#111111] p-6 rounded-[2px] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest text-neutral-500 uppercase mb-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 inline-block"></span>
              <span>Session Active · Authorized via JWT</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-100 uppercase">
              Welcome, {user?.name || 'Customer'}
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl font-sans">
              You are authenticated to access AutoQueue centralized waiting lists and receive competitive quotes from verified car dealerships.
            </p>
          </div>

          <div className="flex items-center space-x-3 font-mono text-xs">
            <div className="border border-[#262626] bg-[#161616] px-3.5 py-2">
              <span className="text-neutral-500 block text-[9px] uppercase">Role Verified</span>
              <span className="text-amber-400 font-semibold uppercase">{user?.role || 'CUSTOMER'}</span>
            </div>
            <div className="border border-[#262626] bg-[#161616] px-3.5 py-2">
              <span className="text-neutral-500 block text-[9px] uppercase">Status</span>
              <span className="text-emerald-400 font-semibold uppercase">Active</span>
            </div>
          </div>
        </div>

        {/* Customer Profile & Token Inspection Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Customer Profile Details (7 Cols) */}
          <div className="lg:col-span-7 border border-[#262626] bg-[#111111] p-6 rounded-[2px]">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-5">
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                Customer Record Details
              </span>
              <span className="font-mono text-[10px] text-neutral-600">Entity: User</span>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-[#1a1a1a]">
                <span className="text-neutral-500">User ID:</span>
                <span className="text-neutral-200 select-all font-mono text-[11px]">{user?.userId || 'N/A'}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-[#1a1a1a]">
                <span className="text-neutral-500">Full Name:</span>
                <span className="text-neutral-200 font-sans font-medium">{user?.name}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-[#1a1a1a]">
                <span className="text-neutral-500">Email Address:</span>
                <span className="text-neutral-200">{user?.email}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-[#1a1a1a]">
                <span className="text-neutral-500">Phone Number:</span>
                <span className="text-neutral-200">{user?.phone || 'Not specified'}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between py-2">
                <span className="text-neutral-500">Registered:</span>
                <span className="text-neutral-400 text-[11px]">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleString() : 'Active Session'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: JWT Token Telemetry (5 Cols) */}
          <div className="lg:col-span-5 border border-[#262626] bg-[#111111] p-6 rounded-[2px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-4">
                <span className="font-mono text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                  JWT Session Token
                </span>
                <span className="font-mono text-[10px] text-amber-500">Bearer</span>
              </div>

              <p className="text-xs text-neutral-400 font-sans mb-4">
                Authentication token issued by Member 1's backend controller:
              </p>

              <div className="border border-[#262626] bg-[#0c0c0c] p-3 font-mono text-[10px] text-neutral-400 break-all leading-relaxed select-all">
                {token ? `${token.slice(0, 48)}...${token.slice(-32)}` : 'No token loaded'}
              </div>

              <button
                type="button"
                onClick={handleCopyToken}
                className="mt-3 w-full border border-[#2c2c2c] hover:border-neutral-400 bg-[#171717] hover:bg-[#202020] text-neutral-300 font-mono text-[11px] uppercase tracking-wider py-2 transition-colors duration-150 rounded-[2px]"
              >
                {copied ? 'Token copied to clipboard' : 'Copy JWT Token'}
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1a1a1a] font-mono text-[10px] text-neutral-500 space-y-1">
              <div className="flex justify-between">
                <span>Storage Key:</span>
                <span className="text-neutral-400">localStorage[autoqueue_jwt_token]</span>
              </div>
              <div className="flex justify-between">
                <span>Header:</span>
                <span className="text-neutral-400">Authorization: Bearer &lt;token&gt;</span>
              </div>
            </div>
          </div>
        </div>

        {/* Queues & Market Activity Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[#262626] bg-[#111111] p-5 rounded-[2px]">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
              Centralized Waiting Lists
            </span>
            <div className="text-2xl font-mono font-bold text-neutral-100">0</div>
            <p className="text-xs text-neutral-400 mt-2 font-sans">
              No active vehicle queues joined yet.
            </p>
          </div>

          <div className="border border-[#262626] bg-[#111111] p-5 rounded-[2px]">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
              Dealer Quotations
            </span>
            <div className="text-2xl font-mono font-bold text-neutral-100">0</div>
            <p className="text-xs text-neutral-400 mt-2 font-sans">
              Dealers will tender offers as vehicles allocate.
            </p>
          </div>

          <div className="border border-[#262626] bg-[#111111] p-5 rounded-[2px]">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
              Confirmed Reservations
            </span>
            <div className="text-2xl font-mono font-bold text-neutral-100">0</div>
            <p className="text-xs text-neutral-400 mt-2 font-sans">
              Irrevocable price snapshots will appear here.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
