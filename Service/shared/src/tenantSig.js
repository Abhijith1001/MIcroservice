import crypto from 'crypto';
import { TENANT_HEADERS } from './constants.js';

export function signTenantHeaders({ tenantId, dbUri }, secret) {
  const payload = `${tenantId}|${dbUri}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return sig;
}

export function verifyTenantHeaders(headers, secret) {
  const tenantId = headers[TENANT_HEADERS.id];
  const dbUri = headers[TENANT_HEADERS.dbUri];
  const providedSigRaw = headers[TENANT_HEADERS.sig];
  if (!tenantId || !dbUri || !providedSigRaw) return false;

  const expected = signTenantHeaders({ tenantId, dbUri }, secret);
  const providedSig = String(providedSigRaw).trim().toLowerCase();

  // Quick length check on hex strings
  if (expected.length !== providedSig.length) return false;

  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(providedSig, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    // If providedSig is not valid hex or any error occurs, treat as invalid
    return false;
  }
}
