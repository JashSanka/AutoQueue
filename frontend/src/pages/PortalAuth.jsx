import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const labels = { CUSTOMER: "Customer", DEALER: "Dealer", ADMIN: "Administrator" };

export default function PortalAuth({ role, register = false }) {
  const { user, login, register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", dealerName: "", city: "", address: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      if (register) { await createAccount({ ...form, role }); navigate(`/${role.toLowerCase()}/login`, { state: { email: form.email } }); }
      else { const signedIn = await login(form.email, form.password, role); navigate(`/${signedIn.role.toLowerCase()}`, { replace: true }); }
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100"><div className="mx-auto max-w-md border border-neutral-800 bg-neutral-900 p-7"><Link to="/" className="text-xs uppercase tracking-widest text-orange-400">← AutoQueue portals</Link><h1 className="mt-5 text-2xl font-bold">{labels[role]} {register ? "registration" : "sign in"}</h1><p className="mt-2 text-sm text-neutral-400">{role === "DEALER" && register ? "Your dealership will require administrator verification before inventory and offers are available." : "Use your AutoQueue account to continue."}</p>{error && <p className="mt-4 border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}<form className="mt-6 space-y-3" onSubmit={submit}>{register && <><Field label="Full name" name="name" form={form} setForm={setForm} required/><Field label="Phone" name="phone" form={form} setForm={setForm} required/>{role === "DEALER" && <><Field label="Dealership name" name="dealerName" form={form} setForm={setForm} required/><Field label="City" name="city" form={form} setForm={setForm} required/><Field label="Address" name="address" form={form} setForm={setForm} required/></>}</>}<Field label="Email" name="email" type="email" form={form} setForm={setForm} required/><Field label="Password" name="password" type="password" form={form} setForm={setForm} required/><button disabled={busy} className="w-full bg-orange-400 px-4 py-2 font-semibold text-neutral-950 disabled:opacity-50">{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button></form>{role !== "ADMIN" && <p className="mt-5 text-sm text-neutral-400">{register ? "Already registered?" : "Need an account?"} <Link className="text-orange-400" to={`/${role.toLowerCase()}/${register ? "login" : "register"}`}>{register ? "Sign in" : "Register"}</Link></p>}{role === "ADMIN" && <p className="mt-5 text-sm text-neutral-500">Administrator accounts are provisioned through the controlled server seed process; public sign-up is unavailable.</p>}</div></main>;
}
function Field({ label, name, type = "text", form, setForm, required }) { return <label className="block text-sm text-neutral-300">{label}<input required={required} type={type} value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} className="mt-1 w-full border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" /></label>; }
