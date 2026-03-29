export type PreferenceOption = {
  label: string
  value: string
}

export type PreferenceSection = {
  id: string
  title: string
  description?: string
  options: PreferenceOption[]
  variant?: "keyword" | "category"
}

export type SavePreferencesPayload = {
  preferences: string[]
}
