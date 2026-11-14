import { useAuth } from "../context/useAuth";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  return <main className="min-h-screen bg-neutral-950 p-10 text-neutral-100"><div className="mx-auto max-w-3xl border border-neutral-800 bg-neutral-900 p-8"><p className="text-xs uppercase tracking-widest text-orange-400">Admin workspace</p><h1 className="mt-2 text-2xl font-bold">Welcome, {user.name}</h1><p className="mt-4 text-neutral-400">Dealer verification is supported by the backend at its documented, protected endpoint. The current API does not provide a dealer listing endpoint, so the dashboard intentionally does not show a non-functional verification table.</p><button className="mt-6 text-sm text-neutral-300" onClick={logout}>Sign out</button></div></main>;
}
