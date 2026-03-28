import api from "@/services/api"
import type { SavePreferencesPayload } from "@/types/preferences"

async function savePreferences(payload: SavePreferencesPayload) {
  return api.post("/auth/update-preferences", payload)
}

export const preferencesService = {
  savePreferences,
}
