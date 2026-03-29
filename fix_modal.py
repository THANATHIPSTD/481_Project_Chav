import re

with open('/Users/chefthanathip/481_Project_Chav/frontend/src/components/RecipeModal.tsx', 'r') as f:
    t = f.read()

t = t.replace('import { useState } from "react"', 'import { useState, useEffect } from "react"')

effect_str = """  const imageList = recipe ? getAllImages(recipe.Images) : []
  const hasMultipleImages = imageList.length > 1
  
  useEffect(() => {
    if (!isOpen) setCurrentImageIdx(0)
  }, [isOpen])
  
  const nextImage = () => setCurrentImageIdx((prev) => (prev + 1) % imageList.length)"""

t = t.replace('  const imageList = recipe ? getAllImages(recipe.Images) : []\n  const hasMultipleImages = imageList.length > 1\n  \n  const nextImage = () => setCurrentImageIdx((prev) => (prev + 1) % imageList.length)', effect_str)

with open('/Users/chefthanathip/481_Project_Chav/frontend/src/components/RecipeModal.tsx', 'w') as f:
    f.write(t)
