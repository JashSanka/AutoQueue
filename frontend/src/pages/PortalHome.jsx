import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function PortalHome() {
  const { user } = useAuth();
  if (user) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;

  const portals = [
    {
      role: "CUSTOMER",
      badge: "Car Buyers",
      title: "Customer Portal",
      description:
        "Browse verified car catalogues, join transparent waiting queues, and receive competitive itemized dealer offers.",
      link: "/customer/login",
      actionText: "Customer Sign In",
      registerLink: "/customer/register",
      registerText: "Create Account",
    },
    {
      role: "DEALER",
      badge: "Regional Dealerships",
      title: "Dealer Portal",
      description:
        "Manage vehicle inventory, configure on-road pricing breakdowns, view eligible customer queues, and tender offers.",
      link: "/dealer/login",
      actionText: "Dealer Sign In",
      registerLink: "/dealer/register",
      registerText: "Register Dealership",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#182235] flex flex-col justify-between p-4 sm:p-6 md:p-12">
      {/* Top Navigation Bar */}
      <header className="mx-auto max-w-4xl w-full flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            AQ
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-slate-900 text-lg">AutoQueue</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">
              v2.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            System Online
          </div>
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <ShieldIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>Admin Sign In</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto max-w-4xl w-full py-10 md:py-14">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
          <p className="text-xs font-bold tracking-widest uppercase text-blue-600">
            AutoQueue Unified Platform
          </p>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Fair, transparent vehicle queues & dealer quotes
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600 text-sm sm:text-base md:text-lg leading-relaxed">
          Connecting car buyers with authorized regional dealerships through verified FIFO queues, itemized pricing breakdowns, and guaranteed booking price snapshots.
        </p>

        {/* Customer & Dealer Portals Grid */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {portals.map((p) => (
            <div
              key={p.role}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    {p.badge}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{p.title}</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  className="inline-flex justify-center items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs"
                  to={p.link}
                >
                  {p.actionText}
                </Link>
                {p.registerLink && (
                  <Link
                    className="inline-flex justify-center items-center rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    to={p.registerLink}
                  >
                    {p.registerText}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Dedicated Admin Portal Entry Point Card */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-amber-300">
                  <ShieldIcon className="w-3.5 h-3.5 text-amber-400" />
                  Administrator Portal · Restricted Access
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Central Platform Administration
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Supervise dealership verifications, manage vehicle catalogue specifications, monitor queue allocations, and audit platform operations.
              </p>
              <p className="text-[11px] text-slate-400">
                Accounts are provisioned via database seed scripts. Public sign-up is disabled.
              </p>
            </div>

            <div className="shrink-0 flex items-center">
              <Link
                to="/admin/login"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-2xs"
              >
                <LockIcon className="w-4 h-4 text-amber-400" />
                <span>Admin Sign In</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mx-auto max-w-4xl w-full pt-8 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p>© {new Date().getFullYear()} AutoQueue. Shared car reservation & inventory queue system.</p>
        <div className="flex items-center gap-4 text-xs">
          <Link to="/customer/login" className="hover:text-blue-600 transition-colors">Customer</Link>
          <span className="text-slate-300">·</span>
          <Link to="/dealer/login" className="hover:text-blue-600 transition-colors">Dealer</Link>
          <span className="text-slate-300">·</span>
          <Link to="/dealer/register" className="hover:text-blue-600 transition-colors">Register Dealer</Link>
          <span className="text-slate-300">·</span>
          <Link to="/admin/login" className="font-semibold text-slate-700 hover:text-slate-900 transition-colors">Admin</Link>
        </div>
      </footer>
    </main>
  );
}

// ---------------- Minimal SVG Icons ----------------

function ShieldIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function LockIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
