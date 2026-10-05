let verifiedToken: string | null = null;
let verifiedAdminName = "";

export function getVerifiedAdminName(token: string): string | null {
  return verifiedToken === token ? verifiedAdminName : null;
}

export function markAdminSessionVerified(token: string, name: string): void {
  verifiedToken = token;
  verifiedAdminName = name;
}

export function clearAdminSessionVerification(): void {
  verifiedToken = null;
  verifiedAdminName = "";
}
