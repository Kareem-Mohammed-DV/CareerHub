/**
 * Test environment — must be imported FIRST in every test file so that
 * config/env.js (which parses process.env at import time) sees these values.
 *
 * DATABASE_URL comes from the environment when present:
 *   - CI: the workflow exports the CI Postgres service URL.
 *   - Locally: nothing is set here, so dotenv/config (imported by config/env.js)
 *     fills it from backend/.env — which is why no fallback is defined below
 *     (dotenv never overrides existing variables, so a fallback would win).
 *
 * Tests create their own rows with unique markers and delete them afterwards,
 * so shared databases stay clean.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789abcdef0123456789abcdef';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789abcdef0123456789abcdef';
