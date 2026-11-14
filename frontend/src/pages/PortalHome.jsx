import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function PortalHome() {
  const { user } = useAuth();
  if (user) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
  const portals = [["CUSTOMER", "Browse vehicles, join queues, and compare offers."], ["DEALER", "Manage verified stock and make customer offers."], ["ADMIN", "Verify dealerships and manage the catalogue."]];
  return <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100"><section className="mx-auto max-w-5xl py-20"><p className="text-xs uppercase tracking-[.25em] text-orange-400">AutoQueue</p><h1 className="mt-3 max-w-2xl text-5xl font-bold">Choose your portal</h1><p className="mt-4 max-w-xl text-neutral-400">A shared queue for car buyers and verified dealers. Select the workspace that matches your account.</p><div className="mt-10 grid gap-5 md:grid-cols-3">{portals.map(([role, text]) => <div key={role} className="border border-neutral-800 bg-neutral-900 p-6"><h2 className="text-xl font-semibold">{role[0] + role.slice(1).toLowerCase()}</h2><p className="mt-3 min-h-16 text-sm text-neutral-400">{text}</p><Link className="mt-5 inline-block bg-orange-400 px-4 py-2 text-sm font-semibold text-neutral-950" to={`/${role.toLowerCase()}/login`}>Open portal</Link></div>)}</div></section></main>;
}
