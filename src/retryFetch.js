/**
 * Fetch wrapper with automatic retry on failure.
 * Retries up to `retries` times with exponential backoff.
 * Only retries on network errors and timeouts (not 4xx/5xx responses).
 */
async function fetchWithRetry(url, options = {}, retries = 2) {
  const maxRetries = Math.max(0, retries);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      // Non-network response — return as-is even if status is 4xx/5xx
      return res;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      if (isLastAttempt) throw err;
      // Exponential backoff: 1s, 2s
      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`[fetchWithRetry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

module.exports = { fetchWithRetry };
