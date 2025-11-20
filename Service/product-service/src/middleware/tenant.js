import { TENANT_HEADERS } from '../../../shared/src/constants.js';
import { verifyTenantHeaders } from '../../../shared/src/tenantSig.js';

export function requireTenant(req, res, next) {
  const secret = process.env.SHARED_TENANT_SIGNING_KEY;
  const allowInsecure = String(process.env.ALLOW_INSECURE_TENANT || '').toLowerCase() === 'true';

  const tenantId = req.headers[TENANT_HEADERS.id];
  const dbUri = req.headers[TENANT_HEADERS.dbUri];

  // If no signing key is configured
  if (!secret) {
    if (allowInsecure && tenantId && dbUri) {
      req.tenant = { id: tenantId, dbUri };
      return next();
    }
    return res.status(500).json({ error: 'Tenant signing key not configured' });
  }

  // With signing key, verify signature
  const ok = verifyTenantHeaders(req.headers, secret);
  if (!ok) {
    if (allowInsecure && tenantId && dbUri) {
      req.tenant = { id: tenantId, dbUri };
      return next();
    }
    return res.status(401).json({ error: 'Invalid tenant signature' });
  }

  req.tenant = { id: tenantId, dbUri };
  next();
}
