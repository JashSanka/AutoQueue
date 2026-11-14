import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const labels = { CUSTOMER: "Customer", DEALER: "Dealer", ADMIN: "Administrator" };

export default function PortalAuth({ role, register = false }) {
  const { user, login, register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    dealerName: "",
    city: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (register) {
        await createAccount({ ...form, role });
        navigate(`/${role.toLowerCase()}/login`, { state: { email: form.email } });
      } else {
        const signedIn = await login(form.email, form.password, role);
        navigate(`/${signedIn.role.toLowerCase()}`, { replace: true });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6">
      <div className="mx-auto max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link to="/" className="text-xs font-semibold uppercase tracking-wider text-blue-600 hover:text-blue-700">
          ← Back to portals
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          {labels[role]} {register ? "Registration" : "Sign In"}
        </h1>
        <p className="mt-2 text-xs text-slate-500">
          {role === "DEALER" && register
            ? "Your dealership will require administrator verification before inventory and offers are available."
            : "Use your AutoQueue account credentials to continue."}
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
            {error}
          </p>
        )}

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {register && (
            <>
              <Field label="Full Name *" name="name" form={form} setForm={setForm} required />
              <Field label="Phone Number *" name="phone" form={form} setForm={setForm} required />
              {role === "DEALER" && (
                <>
                  <Field label="Dealership Name *" name="dealerName" form={form} setForm={setForm} required />
                  <Field label="City *" name="city" form={form} setForm={setForm} required />
                  <Field label="Address *" name="address" form={form} setForm={setForm} required />
                </>
              )}
            </>
          )}

          <Field label="Email Address *" name="email" type="email" form={form} setForm={setForm} required />
          <Field label="Password *" name="password" type="password" form={form} setForm={setForm} required />

          <button
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {busy ? "Please wait…" : register ? "Create Account" : "Sign In"}
          </button>
        </form>

        {role !== "ADMIN" && (
          <p className="mt-6 text-center text-xs text-slate-500">
            {register ? "Already registered?" : "Need an account?"}{" "}
            <Link
              className="font-semibold text-blue-600 hover:text-blue-700"
              to={`/${role.toLowerCase()}/${register ? "login" : "register"}`}
            >
              {register ? "Sign in" : "Register here"}
            </Link>
          </p>
        )}

        {role === "ADMIN" && (
          <p className="mt-6 text-center text-xs text-slate-400">
            Administrator accounts are provisioned securely via database seed scripts. Public sign-up is disabled.
          </p>
        )}
      </div>
    </main>
  );
}

function Field({ label, name, type = "text", form, setForm, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input
        required={required}
        type={type}
        value={form[name]}
        onChange={(event) => setForm({ ...form, [name]: event.target.value })}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
