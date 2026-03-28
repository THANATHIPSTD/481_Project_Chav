import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Search } from "lucide-react"

function App() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-5xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-bold text-zinc-900 mb-6">🍳 Chef's Recipe Search</h1>
        <div className="flex max-w-md mx-auto gap-2">
          <Input type="text" placeholder="Type dish name or ingredients..." className="bg-white" />
          <Button type="submit">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">✨ Recommended Recipes For You</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-48 bg-zinc-200 w-full object-cover flex items-center justify-center text-zinc-400">
              [ Recipe Image ]
            </div>
            <CardHeader>
              <CardTitle className="text-lg">Spaghetti Carbonara</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 line-clamp-2">
                Classic pasta dish with aromatic cheese and bacon. Easy to make but restaurant-quality delicious
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">View Recipe</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default App