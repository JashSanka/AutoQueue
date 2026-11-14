import { useState, useId } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const labels = {
  CUSTOMER: "Customer",
  DEALER: "Dealer",
  ADMIN: "Administrator",
};

export default function PortalAuth({ role, register = false }) {
  const { user, login, register: createAccount, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If redirected from successful registration, capture prefilled state & feedback
  const registeredState = location.state?.registered ? location.state : null;

  const [form, setForm] = useState({
    name: "",
    email: registeredState?.email || "",
    phone: "",
    password: "",
    dealerName: registeredState?.dealerName || "",
    city: "",
    address: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [roleMismatch, setRoleMismatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(!!registeredState);

  // If role is ADMIN and register is true, public registration is forbidden
  if (role === "ADMIN" && register) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] text-[#182235] flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="mx-auto max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center mb-4 shadow-sm">
            <ShieldIcon className="w-6 h-6" />
          </div>
          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 bg-slate-100 rounded-full border border-slate-200 mb-2">
            Restricted System
          </span>
          <h1 className="text-xl font-bold text-slate-900">
            Public Registration Disabled
          </h1>
          <p className="mt-3 text-xs text-slate-600 leading-relaxed">
            AutoQueue administrator accounts cannot be created publicly. Administrative credentials are provisioned exclusively via database seed scripts and infrastructure controls.
          </p>
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3">
            <Link
              to="/admin/login"
              className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <LockIcon className="w-3.5 h-3.5 text-amber-400" />
              Sign In with Authorized Credentials
            </Link>
            <Link
              to="/"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Back to Portal Selection
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // If user is already authenticated
  if (user) {
    // If authenticated user belongs to current portal role, redirect to their workspace
    if (user.role === role) {
      return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
    }

    // If authenticated user belongs to a DIFFERENT role, provide clean switch option
    return (
      <main className="min-h-screen bg-[#f6f8fb] text-[#182235] flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="mx-auto max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-sm">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Currently signed in as</p>
              <p className="text-sm font-bold text-slate-900">{user.name} <span className="text-xs font-normal text-slate-500">({user.email})</span></p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            You are authenticated in the <strong className="font-semibold">{labels[user.role]}</strong> portal. To access the <strong className="font-semibold">{labels[role]}</strong> authentication portal, please sign out first or return to your current workspace.
          </div>

          <div className="mt-6 space-y-3">
            <Link
              to={`/${user.role.toLowerCase()}`}
              className="w-full inline-flex justify-center items-center rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Continue to {labels[user.role]} Workspace →
            </Link>
            <button
              type="button"
              onClick={logout}
              className="w-full inline-flex justify-center items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Sign Out & Sign In as {labels[role]}
            </button>
            <div className="text-center pt-2">
              <Link to="/" className="text-xs text-slate-500 hover:text-slate-800">
                ← Return to Platform Selection
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Client-side validation function
  const validateField = (name, value) => {
    switch (name) {
      case "email": {
        const trimmed = value.trim();
        if (!trimmed) return "Email address is required";
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/.test(trimmed)) {
          return "Please enter a valid email address (e.g. name@example.com)";
        }
        return "";
      }
      case "password": {
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters long";
        return "";
      }
      case "name": {
        if (!register) return "";
        const trimmed = value.trim();
        if (!trimmed) return "Full name is required";
        if (trimmed.length < 2) return "Full name must be at least 2 characters";
        return "";
      }
      case "phone": {
        if (!register) return "";
        const trimmed = value.trim();
        if (!trimmed) return "Phone number is required";
        if (!/^\+?[0-9\s-]{7,15}$/.test(trimmed)) {
          return "Please enter a valid phone number (7-15 digits, optional + prefix)";
        }
        const digits = trimmed.replace(/\D/g, "");
        if (digits.length < 7 || digits.length > 15) {
          return "Phone number must contain between 7 and 15 digits";
        }
        return "";
      }
      case "dealerName": {
        if (!register || role !== "DEALER") return "";
        const trimmed = value.trim();
        if (!trimmed) return "Dealership name is required";
        if (trimmed.length < 2) return "Dealership name must be at least 2 characters";
        return "";
      }
      case "city": {
        if (!register || role !== "DEALER") return "";
        const trimmed = value.trim();
        if (!trimmed) return "City is required";
        if (trimmed.length < 2) return "City must be at least 2 characters";
        return "";
      }
      case "address": {
        if (!register || role !== "DEALER") return "";
        const trimmed = value.trim();
        if (!trimmed) return "Dealership address is required";
        if (trimmed.length < 5) return "Dealership address must be at least 5 characters";
        return "";
      }
      default:
        return "";
    }
  };

  const validateAll = () => {
    const errors = {};
    const fieldsToValidate = register
      ? role === "DEALER"
        ? ["name", "email", "phone", "password", "dealerName", "city", "address"]
        : ["name", "email", "phone", "password"]
      : ["email", "password"];

    fieldsToValidate.forEach((f) => {
      const err = validateField(f, form[f], form);
      if (err) errors[f] = err;
    });

    return errors;
  };

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (generalError) setGeneralError("");
    if (roleMismatch) setRoleMismatch(null);
  };

  const handleBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, form[name], form);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setGeneralError("");
    setRoleMismatch(null);

    // Mark all relevant fields as touched
    const touchedMap = {};
    const relevantFields = register
      ? role === "DEALER"
        ? ["name", "email", "phone", "password", "dealerName", "city", "address"]
        : ["name", "email", "phone", "password"]
      : ["email", "password"];

    relevantFields.forEach((f) => {
      touchedMap[f] = true;
    });
    setTouched(touchedMap);

    const errors = validateAll();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setBusy(true);
    try {
      if (register) {
        await createAccount({ ...form, role });
        // Redirect to login with registration metadata for user feedback
        navigate(`/${role.toLowerCase()}/login`, {
          state: {
            registered: true,
            email: form.email.trim().toLowerCase(),
            dealerName: form.dealerName?.trim() || "",
            role: role,
            message:
              role === "DEALER"
                ? "Your dealership registration has been submitted successfully! Accounts require administrator verification before vehicle inventory and queue operations can be conducted."
                : "Your customer account has been created successfully! Please sign in with your credentials.",
          },
        });
      } else {
        const signedIn = await login(form.email, form.password, role);
        navigate(`/${signedIn.role.toLowerCase()}`, { replace: true });
      }
    } catch (requestError) {
      const msg = requestError.message || "Authentication request failed.";
      // Detect role mismatch
      if (msg.toLowerCase().includes("belongs to the")) {
        setRoleMismatch(msg);
      } else if (requestError.data?.errors && Array.isArray(requestError.data.errors)) {
        const backendErrors = {};
        requestError.data.errors.forEach((e) => {
          if (e.field) backendErrors[e.field] = e.message;
        });
        setFieldErrors((prev) => ({ ...prev, ...backendErrors }));
        setGeneralError(requestError.data.message || msg);
      } else {
        setGeneralError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  // UI Role Badge Styling
  const getRoleBadge = () => {
    if (role === "ADMIN") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-amber-300 border border-slate-700 shadow-xs">
          <ShieldIcon className="w-3.5 h-3.5 text-amber-400" />
          Central Administrator Console
        </span>
      );
    }
    if (role === "DEALER") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
          <BuildingIcon className="w-3.5 h-3.5 text-blue-600" />
          Authorized Dealership Network
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <UserIcon className="w-3.5 h-3.5 text-slate-600" />
        Customer Portal
      </span>
    );
  };

  const isWideForm = register && role === "DEALER";

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#182235] flex flex-col justify-center items-center p-4 sm:p-6 md:p-8">
      {/* Top Brand Link */}
      <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl mb-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back to Portal Selection
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          AutoQueue 2.0 Auth
        </div>
      </div>

      <div
        className={`mx-auto w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 md:p-10 shadow-sm transition-all ${
          isWideForm ? "max-w-2xl" : "max-w-md"
        }`}
      >
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {getRoleBadge()}
            {role === "ADMIN" && (
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Restricted Access
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {role === "ADMIN"
              ? "Administrator Sign In"
              : `${labels[role]} ${register ? "Registration" : "Sign In"}`}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            {role === "ADMIN" &&
              "Access central system oversight, dealer verification controls, and vehicle catalog management."}
            {role === "DEALER" &&
              !register &&
              "Sign in to manage your vehicle inventory, view eligible customer queues, and submit verified price offers."}
            {role === "DEALER" &&
              register &&
              "Register your dealership to participate in regional vehicle queues and tender competitive itemized offers."}
            {role === "CUSTOMER" &&
              !register &&
              "Sign in to browse car waiting lists, track queue positions, and accept dealer quotes."}
            {role === "CUSTOMER" &&
              register &&
              "Create a customer account to join vehicle reservation queues with guaranteed pricing."}
          </p>
        </div>

        {/* Successful Registration Feedback Banner */}
        {showSuccessBanner && registeredState && !register && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-950 flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-emerald-900 text-sm">
                Registration Successful!
              </p>
              <p className="mt-1 text-emerald-800 leading-relaxed">
                {registeredState.message || "Your account has been created."}
              </p>
              {registeredState.role === "DEALER" && (
                <div className="mt-2 pt-2 border-t border-emerald-200/70 text-[11px] text-emerald-700">
                  <strong>Verification Status:</strong> Pending administrator review. You can log in below to access your workspace.
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessBanner(false)}
              className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-1"
              aria-label="Dismiss banner"
            >
              ×
            </button>
          </div>
        )}

        {/* Dealer Pending Verification Informational Notice on Registration */}
        {role === "DEALER" && register && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950 flex items-start gap-3">
            <InfoIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-900">
                Dealer Verification Policy
              </p>
              <p className="mt-1 text-amber-800 leading-relaxed">
                Under AutoQueue platform rules, newly registered dealers remain in an <strong>unverified state</strong> until an administrator validates dealership credentials. Unverified accounts cannot add vehicle inventory or publish price offers to customer queues.
              </p>
            </div>
          </div>
        )}

        {/* Admin Provisioning Notice */}
        {role === "ADMIN" && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 flex items-center gap-2.5">
            <LockIcon className="w-4 h-4 text-slate-500 shrink-0" />
            <p className="leading-relaxed">
              Public administrator sign-up is disabled. Accounts are provisioned securely via database seed scripts.
            </p>
          </div>
        )}

        {/* Top-Level General Error Banner */}
        {generalError && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-start gap-2.5"
          >
            <AlertCircleIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{generalError}</div>
          </div>
        )}

        {/* Role Mismatch Handling with Direct Switch Action */}
        {roleMismatch && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-950"
          >
            <div className="flex items-start gap-2.5">
              <InfoIcon className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-indigo-900">Role Verification Notice</p>
                <p className="mt-0.5 text-indigo-800">{roleMismatch}</p>
                <div className="mt-3 flex gap-2">
                  {roleMismatch.toLowerCase().includes("customer") && (
                    <Link
                      to="/customer/login"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors"
                    >
                      Go to Customer Sign In <ArrowRightIcon className="w-3 h-3" />
                    </Link>
                  )}
                  {roleMismatch.toLowerCase().includes("dealer") && (
                    <Link
                      to="/dealer/login"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors"
                    >
                      Go to Dealer Sign In <ArrowRightIcon className="w-3 h-3" />
                    </Link>
                  )}
                  {roleMismatch.toLowerCase().includes("admin") && (
                    <Link
                      to="/admin/login"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors"
                    >
                      Go to Admin Sign In <ArrowRightIcon className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Authentication Form */}
        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          {register && role === "DEALER" ? (
            /* Grouped Dealer Registration Layout */
            <div className="space-y-6">
              {/* Group 1: Personal Information */}
              <div className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <UserIcon className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    1. Representative Personal Information
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Full Name"
                    name="name"
                    autoComplete="name"
                    placeholder="e.g. Aman Sharma"
                    icon={<UserIcon className="w-4 h-4 text-slate-400" />}
                    value={form.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.name ? fieldErrors.name : ""}
                    required
                  />
                  <InputField
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="e.g. 9876543210"
                    icon={<PhoneIcon className="w-4 h-4 text-slate-400" />}
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.phone ? fieldErrors.phone : ""}
                    helperText="7 to 15 digits (e.g., +91 9876543210)"
                    required
                  />
                </div>
              </div>

              {/* Group 2: Account Credentials */}
              <div className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <LockIcon className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    2. Portal Account Credentials
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Email Address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="dealer@dealership.com"
                    icon={<MailIcon className="w-4 h-4 text-slate-400" />}
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email ? fieldErrors.email : ""}
                    required
                  />
                  <PasswordField
                    label="Account Password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password ? fieldErrors.password : ""}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    helperText="Must be at least 8 characters"
                    required
                  />
                </div>
              </div>

              {/* Group 3: Dealership Information */}
              <div className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <BuildingIcon className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    3. Dealership Business Information
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <InputField
                      label="Dealership Trade Name"
                      name="dealerName"
                      placeholder="e.g. Apex Motors Pvt. Ltd."
                      icon={<BuildingIcon className="w-4 h-4 text-slate-400" />}
                      value={form.dealerName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.dealerName ? fieldErrors.dealerName : ""}
                      required
                    />
                  </div>
                  <InputField
                    label="Operating City"
                    name="city"
                    placeholder="e.g. Mumbai"
                    icon={<MapPinIcon className="w-4 h-4 text-slate-400" />}
                    value={form.city}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.city ? fieldErrors.city : ""}
                    required
                  />
                  <InputField
                    label="Complete Physical Address"
                    name="address"
                    placeholder="e.g. Plot 42, Andheri East"
                    icon={<AddressIcon className="w-4 h-4 text-slate-400" />}
                    value={form.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.address ? fieldErrors.address : ""}
                    helperText="Minimum 5 characters"
                    required
                  />
                </div>
              </div>
            </div>
          ) : register ? (
            /* Customer Registration Layout */
            <div className="space-y-4">
              <InputField
                label="Full Name"
                name="name"
                autoComplete="name"
                placeholder="e.g. Rahul Verma"
                icon={<UserIcon className="w-4 h-4 text-slate-400" />}
                value={form.name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.name ? fieldErrors.name : ""}
                required
              />
              <InputField
                label="Phone Number"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="e.g. 9876543210"
                icon={<PhoneIcon className="w-4 h-4 text-slate-400" />}
                value={form.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.phone ? fieldErrors.phone : ""}
                helperText="7 to 15 digits"
                required
              />
              <InputField
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="customer@example.com"
                icon={<MailIcon className="w-4 h-4 text-slate-400" />}
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.email ? fieldErrors.email : ""}
                required
              />
              <PasswordField
                label="Password"
                name="password"
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.password ? fieldErrors.password : ""}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                helperText="Must be at least 8 characters"
                required
              />
            </div>
          ) : (
            /* Standard Login Layout (Dealer, Admin, Customer) */
            <div className="space-y-4">
              <InputField
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={
                  role === "ADMIN"
                    ? "admin@autoqueue.com"
                    : role === "DEALER"
                    ? "dealer@dealership.com"
                    : "user@example.com"
                }
                icon={<MailIcon className="w-4 h-4 text-slate-400" />}
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.email ? fieldErrors.email : ""}
                required
              />
              <PasswordField
                label="Password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.password ? fieldErrors.password : ""}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                required
              />
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className={`w-full inline-flex justify-center items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                role === "ADMIN"
                  ? "bg-slate-900 hover:bg-slate-800 focus:ring-slate-900"
                  : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
              }`}
            >
              {busy ? (
                <>
                  <SpinnerIcon className="w-4 h-4 animate-spin text-white" />
                  <span>
                    {register
                      ? "Registering Account…"
                      : role === "ADMIN"
                      ? "Authenticating Administrator…"
                      : "Signing In…"}
                  </span>
                </>
              ) : (
                <>
                  {role === "ADMIN" && <LockIcon className="w-4 h-4 text-amber-300" />}
                  <span>
                    {register
                      ? role === "DEALER"
                        ? "Register Dealership"
                        : "Create Customer Account"
                      : role === "ADMIN"
                      ? "Sign In to Admin Console"
                      : `Sign In as ${labels[role]}`}
                  </span>
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Portal Navigation & Cross-Links */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          {role !== "ADMIN" && (
            <div className="text-center text-xs text-slate-500 space-y-2">
              <p>
                {register ? "Already registered your dealership?" : "Need to register your dealership?"}{" "}
                <Link
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                  to={`/${role.toLowerCase()}/${register ? "login" : "register"}`}
                >
                  {register ? "Sign in to existing account" : "Register new dealership"}
                </Link>
              </p>
              {role === "DEALER" && !register && (
                <p className="text-[11px] text-slate-400">
                  Note: Newly registered accounts undergo admin verification before full inventory access is granted.
                </p>
              )}
            </div>
          )}

          {role === "ADMIN" && (
            <div className="text-center space-y-2">
              <p className="text-xs text-slate-500">
                AutoQueue Administrative Gateway · Encrypted JWT Sessions
              </p>
              <p className="text-[11px] text-slate-400">
                Unauthorized access attempts are monitored and recorded.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * Reusable Accessible Input Field with Leading Icon & Error State
 */
function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  autoComplete,
  icon,
  helperText,
  required,
}) {
  const id = useId();
  const hasError = !!error;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="block text-xs font-bold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {helperText && !hasError && (
          <span className="text-[10px] text-slate-400">{helperText}</span>
        )}
      </div>
      <div className="relative rounded-lg shadow-2xs">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            {icon}
          </div>
        )}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          onChange={(e) => onChange(name, e.target.value)}
          onBlur={() => onBlur && onBlur(name)}
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`w-full rounded-lg border bg-white py-2.5 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
            icon ? "pl-9" : "pl-3"
          } pr-3 ${
            hasError
              ? "border-red-300 focus:border-red-500 focus:ring-red-200"
              : "border-slate-300 focus:border-blue-600 focus:ring-blue-500/20"
          }`}
        />
      </div>
      {hasError && (
        <p id={`${id}-error`} className="text-[11px] font-medium text-red-600 flex items-center gap-1 mt-1">
          <AlertCircleIcon className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Reusable Password Field with Show/Hide Visibility Toggle
 */
function PasswordField({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  autoComplete,
  showPassword,
  setShowPassword,
  helperText,
  required,
}) {
  const id = useId();
  const hasError = !!error;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="block text-xs font-bold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {helperText && !hasError && (
          <span className="text-[10px] text-slate-400">{helperText}</span>
        )}
      </div>
      <div className="relative rounded-lg shadow-2xs">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <LockIcon className="w-4 h-4 text-slate-400" />
        </div>
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          onChange={(e) => onChange(name, e.target.value)}
          onBlur={() => onBlur && onBlur(name)}
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-10 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
            hasError
              ? "border-red-300 focus:border-red-500 focus:ring-red-200"
              : "border-slate-300 focus:border-blue-600 focus:ring-blue-500/20"
          }`}
        />
        <button
          type="button"
          tabIndex={0}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700 focus:outline-none"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOffIcon className="w-4 h-4" />
          ) : (
            <EyeIcon className="w-4 h-4" />
          )}
        </button>
      </div>
      {hasError && (
        <p id={`${id}-error`} className="text-[11px] font-medium text-red-600 flex items-center gap-1 mt-1">
          <AlertCircleIcon className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------- SVG Icons ----------------

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

function UserIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function MailIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function PhoneIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function BuildingIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function MapPinIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function AddressIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-6-2.182" />
    </svg>
  );
}

function EyeIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertCircleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function InfoIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
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

function SpinnerIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
  );
}
