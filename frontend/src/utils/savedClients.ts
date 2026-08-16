const savedClientsKey = "timeTracker.savedClients";

export function loadSavedClients(): string[] {
  try {
    const value = window.localStorage.getItem(savedClientsKey);
    const parsed = value ? JSON.parse(value) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((client): client is string => typeof client === "string");
  } catch {
    return [];
  }
}

export function saveClientName(clientName: string, existingClients: string[]): string[] {
  const cleaned = clientName.trim();
  if (!cleaned) {
    return existingClients;
  }

  const withoutDuplicate = existingClients.filter(
    (client) => client.toLowerCase() !== cleaned.toLowerCase(),
  );
  const nextClients = [cleaned, ...withoutDuplicate].sort((a, b) => a.localeCompare(b));
  window.localStorage.setItem(savedClientsKey, JSON.stringify(nextClients));
  return nextClients;
}
