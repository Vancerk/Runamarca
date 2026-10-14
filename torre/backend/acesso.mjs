// A lista adicional libera os controles administrativos da Torre, não o GitHub.
export function isTorreAdmin(discordId, {
  adminId = process.env.DISCORD_ADMIN_ID,
  extra = process.env.TORRE_ADMIN_IDS
} = {}) {
  if (typeof discordId !== 'string' || !/^\d{15,22}$/.test(discordId)) return false;
  if (discordId === adminId) return true;
  return String(extra || '').split(',').some(value => {
    const id = value.trim();
    return /^\d{15,22}$/.test(id) && id === discordId;
  });
}
