export function isValidUUID(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function getCurrentCabanaId(): string | null {
  // This will be populated by the auth context
  // For now, return null to trigger proper error handling
  return null;
}