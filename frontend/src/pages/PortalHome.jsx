import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function PortalHome() {
  const { user } = useAuth();
  if (user) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;

  const portals = [
    {
      role: "CUSTOMER",
      title: "Customer Portal",
      description: "Browse verified car catalogues, join transparent waiting queues, and receive competitive itemized dealer offers.",
      link: "/customer/login",
      actionText: "Customer Sign In",
      registerLink: "/customer/register"
    },
    {
      role: "DEALER",
      title: "Dealer Portal",
      description: "Manage vehicle inventory, configure on-road pricing breakdowns, view eligible customer queues, and tender offers.",
      link: "/dealer/login",
      actionText: "Dealer Sign In",
      registerLink: "/dealer/register"
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-6 md:p-12">
      <div className="mx-auto max-w-4xl w-full py-12">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
          <p className="text-xs font-bold tracking-widest uppercase text-blue-600">AutoQueue Platform</p>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
          Fair, transparent vehicle queues & dealer quotes
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600 text-base md:text-lg">
          Connecting car buyers with authorized regional dealerships through verified FIFO queues, itemized pricing breakdowns, and guaranteed booking price snapshots.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {portals.map((p) => (
            <div key={p.role} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{p.title}</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.description}</p>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  className="inline-flex justify-center items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  to={p.link}
                >
                  {p.actionText}
                </Link>
                {p.registerLink && (
                  <Link
                    className="inline-flex justify-center items-center rounded-lg border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    to={p.registerLink}
                  >
                    Create Account
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="mx-auto max-w-4xl w-full pt-8 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p>© {new Date().getFullYear()} AutoQueue. Shared car reservation & inventory queue system.</p>
        <p className="font-mono text-slate-400">Secure JWT Authentication · Role-Based Access</p>
      </footer>
    </main>
  );
}
