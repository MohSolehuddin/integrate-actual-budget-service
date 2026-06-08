const config = require('../config');
const { db, getUserBySenderId } = require('../database');

// In-memory token cache
const tokenCache = new Map();

/**
 * Calculate expiry timestamp from seconds
 */
const getExpiryTimestamp = (expiresIn) => {
  return Date.now() + (expiresIn * 1000);
};

/**
 * Get authenticated token for a sender, using cache or re-authenticating
 */
const getAuthenticatedToken = async (senderId) => {
  const cached = tokenCache.get(senderId);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`Using cached token for sender: ${senderId}`);
    return cached.accessToken;
  }

  // Token expired or missing, re-authenticate
  console.log(`Re-authenticating for sender: ${senderId}`);
  const authed = await login(senderId);
  return authed.accessToken;
};

/**
 * Login to Actual Budget service and cache token
 */
const login = async (senderId) => {
  try {
    const user = await getUserBySenderId(senderId);
    if (!user) {
      throw new Error(`User not found for sender_id: ${senderId}`);
    }

    const response = await fetch(`${config.ACTUAL_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.email,
        password: config.ACTUAL_DEFAULT_PASSWORD
      })
    });

    if (!response.ok) {
      throw new Error(`Login failed for ${senderId}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.token) {
      throw new Error(`No token returned from login for ${senderId}`);
    }

    // Cache the token (default 7 days expiry)
    const expiresAt = getExpiryTimestamp(604800); // 7 days in seconds
    tokenCache.set(senderId, {
      accessToken: data.token,
      refreshToken: data.refreshToken || null,
      expiresAt: expiresAt
    });

    console.log(`Login successful for sender: ${senderId}, token expires at: ${new Date(expiresAt).toISOString()}`);
    
    return {
      accessToken: data.token,
      refreshToken: data.refreshToken || null,
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error(`Login failed for ${senderId}:`, error.message);
    throw error;
  }
};

/**
 * Logout and clear token cache
 */
const logout = (senderId) => {
  tokenCache.delete(senderId);
  console.log(`Logged out sender: ${senderId}`);
};

/**
 * Clear all tokens (for maintenance)
 */
const clearAllTokens = () => {
  tokenCache.clear();
  console.log('Cleared all tokens from cache');
};

module.exports = {
  getAuthenticatedToken,
  login,
  logout,
  clearAllTokens,
  tokenCache
};
