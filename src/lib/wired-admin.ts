export function wiredAdminEmail() {
  return (process.env.ADMIN_USERNAME || "admin").toLowerCase().trim();
}

export function isWiredAdmin(email: string) {
  return email.toLowerCase().trim() === wiredAdminEmail();
}
