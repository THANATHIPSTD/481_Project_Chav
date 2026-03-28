import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Sparkles, Check, ChevronRight, ChevronLeft } from "lucide-react"
import { AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { preferencesService } from "@/services/preferencesService"
import type { PreferenceSection } from "@/types/preferences"

const keywordSections: PreferenceSection[] = [
  {
    id: "speed",
    title: "Phase 1 · Time & Ease",
    description: "Pick how quick or simple you want your meals to be.",
    options: [
      { label: "Easy", value: "Easy" },
      { label: "Beginner Cook", value: "Beginner Cook" },
      { label: "< 15 Mins", value: "< 15 Mins" },
      { label: "< 30 Mins", value: "< 30 Mins" },
      { label: "< 60 Mins", value: "< 60 Mins" },
      { label: "< 4 Hours", value: "< 4 Hours" },
    ],
  },
  {
    id: "proteins",
    title: "Phase 2 · Main Ingredients",
    description: "Choose the proteins or bases you enjoy cooking with.",
    options: [
      { label: "Meat", value: "Meat" },
      { label: "Poultry", value: "Poultry" },
      { label: "Chicken", value: "Chicken" },
      { label: "Vegetable", value: "Vegetable" },
      { label: "Fruit", value: "Fruit" },
      { label: "Cheese", value: "Cheese" },
    ],
  },
  {
    id: "health",
    title: "Phase 3 · Health & Budget",
    description: "Focus on health goals or budget-friendly picks.",
    options: [
      { label: "Healthy", value: "Healthy" },
      { label: "Low Cholesterol", value: "Low Cholesterol" },
      { label: "Low Protein", value: "Low Protein" },
      { label: "Inexpensive", value: "Inexpensive" },
    ],
  },
  {
    id: "vibe",
    title: "Phase 4 · Mood & Occasions",
    description: "Match recipes to moments, moods, or gatherings.",
    options: [
      { label: "Weeknight", value: "Weeknight" },
      { label: "For Large Groups", value: "For Large Groups" },
      { label: "Kid Friendly", value: "Kid Friendly" },
      { label: "Brunch", value: "Brunch" },
      { label: "Dessert", value: "Dessert" },
      { label: "Cookie & Brownie", value: "Cookie & Brownie" },
      { label: "Asian", value: "Asian" },
      { label: "European", value: "European" },
    ],
  },
]

const categorySection: PreferenceSection = {
  id: "categories",
  title: "Phase 5 · Recipe Categories",
  description: "Choose primary categories to tune your feed.",
  variant: "category",
  options: [
    { label: "Dessert", value: "Dessert" },
    { label: "Lunch/Scks", value: "Lunch/Scks" },
    { label: "One Dish Meal", value: "One Dish Meal" },
    { label: "Vegetable", value: "Vegetable" },
    { label: "Breakfast", value: "Breakfast" },
    { label: "Beverages", value: "Beverages" },
    { label: "Chicken", value: "Chicken" },
    { label: "Meat", value: "Meat" },
    { label: "Breads", value: "Breads" },
    { label: "Pork", value: "Pork" },
    { label: "Sauces", value: "Sauces" },
    { label: "Chicken Breast", value: "Chicken Breast" },
    { label: "Potato", value: "Potato" },
    { label: "Quick Breads", value: "Quick Breads" },
    { label: "< 60 Mins", value: "< 60 Mins" },
    { label: "< 30 Mins", value: "< 30 Mins" },
    { label: "Cheese", value: "Cheese" },
    { label: "Pie", value: "Pie" },
    { label: "Bar Cookie", value: "Bar Cookie" },
    { label: "Low Protein", value: "Low Protein" },
  ],
}

function OptionPill({
  label,
  active,
  onToggle,
}: {
  label: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative flex items-center gap-3 rounded-full border px-6 py-3.5 text-sm font-medium transition-all duration-300 active:scale-95 ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white shadow-xl shadow-zinc-200"
          : "border-zinc-200 bg-white/50 text-zinc-600 hover:border-zinc-400 hover:bg-white"
      }`}
    >
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
          active ? "border-white/30 bg-white/20" : "border-zinc-200 bg-zinc-50 group-hover:border-zinc-300"
        }`}
      >
        {active ? <Check className="h-3 w-3 text-white" /> : <Sparkles className="h-3 w-3 text-zinc-400" />}
      </div>
      <span className="tracking-tight">{label}</span>
    </button>
  )
}

export default function Preferences() {
  const navigate = useNavigate()
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  const allSections = useMemo(() => [...keywordSections, categorySection], [])
  const totalSteps = allSections.length
  const currentSection = allSections[currentStep]
  const progress = ((currentStep + 1) / totalSteps) * 100

  const toggleKeyword = (value: string) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev)
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const preferences = [...selectedKeywords, ...selectedCategories]
      await preferencesService.savePreferences({ preferences })
      setSuccess("Preferences saved. Enjoy your personalized feed!")
      setTimeout(() => navigate("/"), 600)
    } catch (err) {
      console.error("Save preferences error", err)
      setError("Save failed. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      void handleSubmit()
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat font-sans selection:bg-black/10 text-zinc-900"
      style={{ backgroundImage: "url('https://img1.pic.in.th/images/11309251.png')" }}
    >
      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/30 backdrop-blur-md shadow-inner">
          <div
            className="h-full bg-zinc-800 transition-all duration-500 ease-out shadow-md"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card className="w-full overflow-hidden rounded-[2.5rem] border-white/50 bg-white/65 shadow-[0_30px_120px_-70px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
          <CardHeader className="p-10 pb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-900">
                {currentSection.title}
              </CardTitle>
              <CardDescription className="text-base text-zinc-700">
                {currentSection.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-10 pb-10">
            <div className="flex flex-wrap justify-center gap-3">
              <AnimatePresence mode="wait">
                {currentSection.options.map((opt) => (
                  <OptionPill
                    key={opt.value}
                    label={opt.label}
                    active={
                      currentSection.variant === "category"
                        ? selectedCategories.has(opt.value)
                        : selectedKeywords.has(opt.value)
                    }
                    onToggle={() =>
                      currentSection.variant === "category"
                        ? toggleCategory(opt.value)
                        : toggleKeyword(opt.value)
                    }
                  />
                ))}
              </AnimatePresence>
            </div>
          </CardContent>

          <div className="flex items-center justify-between border-t border-white/30 bg-white/20 px-10 py-6">
            <Button
              variant="ghost"
              className="h-12 rounded-2xl px-6 text-zinc-600 transition-colors hover:text-black hover:bg-white/30"
              onClick={() => navigate("/")}
            >
              Skip
            </Button>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className={`h-12 w-12 rounded-2xl border-white/50 bg-white/50 text-black transition-all hover:bg-white/80 ${currentStep === 0 ? "opacity-0" : "opacity-100"}`}
                onClick={handleBack}
                disabled={currentStep === 0 || saving}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <Button
                onClick={handleNext}
                disabled={saving}
                className="h-12 min-w-[140px] rounded-2xl bg-zinc-900 px-8 text-white shadow-lg shadow-zinc-200 transition-all hover:bg-zinc-800 active:scale-95"
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <span className="flex items-center gap-2">
                    {currentStep === totalSteps - 1 ? "Finish" : "Continue"}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <p className="mt-8 max-w-sm text-center text-sm font-medium text-black/40 drop-shadow-md">
          Phase {currentStep + 1} of {totalSteps} • Selected {selectedKeywords.size + selectedCategories.size} preferences
          {error && <span className="text-red-300 drop-shadow-sm"> • {error}</span>}
          {success && <span className="text-emerald-300 drop-shadow-sm"> • {success}</span>}
        </p>
      </div>
    </div>
  )
}
