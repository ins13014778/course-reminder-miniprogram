export function buildAdminAuditProfile(admin?: any) {
  return {
    adminEmail: admin?.email || null,
    adminName: admin?.name || null,
    adminRole: admin?.role || null,
  };
}
