/**
 * Verifies the bearer token used by internal webhook and edge-function calls.
 * This is intended for server-to-server authentication, not end-user sessions.
 */
export function hasExpectedBearerToken(
  request: Request,
  expectedToken: string,
) {
  const authorizationHeader = request.headers.get("authorization");
  if (!authorizationHeader) {
    return false;
  }

  const bearerPrefix = "Bearer ";
  if (!authorizationHeader.startsWith(bearerPrefix)) {
    return false;
  }

  const providedToken = authorizationHeader.slice(bearerPrefix.length).trim();
  return providedToken.length > 0 && providedToken === expectedToken;
}

/**
 * Verifies an exact shared-secret value in an internal request header.
 */
export function hasExpectedHeaderValue(
  request: Request,
  headerName: string,
  expectedValue: string,
) {
  const providedValue = request.headers.get(headerName)?.trim();
  return Boolean(providedValue) && providedValue === expectedValue;
}
