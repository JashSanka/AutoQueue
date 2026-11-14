/**
 * AutoQueue Customer Auth API Client
 * Connects directly to backend Express auth routes (/api/auth)
 */

const API_BASE = '/api/auth';

/**
 * Handle HTTP responses and extract json or error messages
 */
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = { success: false, message: 'Server returned a non-JSON response.' };
  }

  if (!response.ok) {
    const errorMsg = data.errors && Array.isArray(data.errors)
      ? data.errors.map(err => err.message).join(' | ')
      : data.message || `Request failed with status ${response.status}`;
    
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Register a new Customer account
 * Backend expects: { name, email, password, phone, role: "CUSTOMER" }
 */
export async function registerUser({ name, email, password, phone, role = 'CUSTOMER', dealerName, city, address }) {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim(),
      role,
      ...(role === 'DEALER' ? { dealerName: dealerName?.trim(), city: city?.trim(), address: address?.trim() } : {}),
    }),
  });

  return handleResponse(response);
}

export const registerCustomer = (details) => registerUser({ ...details, role: 'CUSTOMER' });

/**
 * Login Customer with email and password
 * Backend expects: { email, password }
 */
export async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  return handleResponse(response);
}

/**
 * Get authenticated user profile using JWT token
 */
export async function getProfile(token) {
  const response = await fetch(`${API_BASE}/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}
