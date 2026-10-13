const PREFIX = "bcc_assistant_widget_sessions_v2:";
const LEGACY_KEYS = ["bcc_assistant_widget_sessions_v1"];

export function assistantHistoryKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

/** Remove históricos do assistente de outros usuários (ou todos, se `keepUserId` for omitido). */
export function clearAssistantHistory(keepUserId?: string): void {
  try {
    const keep = keepUserId ? assistantHistoryKey(keepUserId) : null;
    const toRemove: string[] = [...LEGACY_KEYS];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX) && k !== keep) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    // localStorage indisponível (modo privado / bloqueado).
  }
}
