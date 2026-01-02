"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Check, Building2, Laptop, Heart, Banknote, ShoppingBag, Factory, Home, GraduationCap, UtensilsCrossed, HardHat, Truck, MoreHorizontal, Briefcase } from "lucide-react"
import { Input } from "@/components/ui/input"

// --- Hook Definition ---
function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// --- Interfaces & Data ---
interface Category {
  id: string
  label: string
  icon: React.ReactNode
  description?: string
}

const businessCategories: Category[] = [
  {
    id: "technology",
    label: "Technology",
    icon: <Laptop className="h-4 w-4 text-blue-500" />,
    description: "Software, IT Services",
  },
  {
    id: "healthcare",
    label: "Healthcare",
    icon: <Heart className="h-4 w-4 text-red-500" />,
    description: "Medical, Wellness",
  },
  {
    id: "finance",
    label: "Finance",
    icon: <Banknote className="h-4 w-4 text-green-500" />,
    description: "Banking, Insurance",
  },
  {
    id: "retail",
    label: "Retail",
    icon: <ShoppingBag className="h-4 w-4 text-purple-500" />,
    description: "E-commerce, Stores",
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    icon: <Factory className="h-4 w-4 text-gray-500" />,
    description: "Production, Industrial",
  },
  {
    id: "real-estate",
    label: "Real Estate",
    icon: <Home className="h-4 w-4 text-orange-500" />,
    description: "Property, Construction",
  },
  {
    id: "education",
    label: "Education",
    icon: <GraduationCap className="h-4 w-4 text-indigo-500" />,
    description: "Schools, Training",
  },
  {
    id: "hospitality",
    label: "Hospitality",
    icon: <UtensilsCrossed className="h-4 w-4 text-amber-500" />,
    description: "Hotels, Restaurants",
  },
  {
    id: "construction",
    label: "Construction",
    icon: <HardHat className="h-4 w-4 text-yellow-600" />,
    description: "Building, Infrastructure",
  },
  {
    id: "transportation",
    label: "Transportation",
    icon: <Truck className="h-4 w-4 text-cyan-500" />,
    description: "Logistics, Delivery",
  },
  {
    id: "consulting",
    label: "Consulting",
    icon: <Briefcase className="h-4 w-4 text-slate-500" />,
    description: "Business Services",
  },
  {
    id: "other",
    label: "Other",
    icon: <MoreHorizontal className="h-4 w-4 text-gray-400" />,
    description: "Custom category",
  },
]

interface CategorySearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CategorySearch({ value, onChange, placeholder = "Search or select a business category..." }: CategorySearchProps) {
  const [query, setQuery] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const [filteredCategories, setFilteredCategories] = useState<Category[]>(businessCategories)
  const [showOtherInput, setShowOtherInput] = useState(false)
  const [customCategory, setCustomCategory] = useState("")
  
  const debouncedQuery = useDebounce(query, 200)

  useEffect(() => {
    if (!debouncedQuery) {
      setFilteredCategories(businessCategories)
      return
    }

    const normalizedQuery = debouncedQuery.toLowerCase().trim()
    const filtered = businessCategories.filter((category) => {
      const searchableText = `${category.label} ${category.description || ""}`.toLowerCase()
      return searchableText.includes(normalizedQuery)
    })
    
    setFilteredCategories(filtered)
  }, [debouncedQuery])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setQuery(newValue)
    setShowOtherInput(false)
  }

  const handleSelectCategory = (category: Category) => {
    if (category.id === "other") {
      setShowOtherInput(true)
      setQuery("")
      setIsFocused(false)
    } else {
      setQuery(category.label)
      onChange(category.label)
      setIsFocused(false)
      setShowOtherInput(false)
    }
  }

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomCategory(val)
    onChange(val)
  }

  const handleFocus = () => {
    if (!showOtherInput) {
      setIsFocused(true)
    }
  }

  const handleBlur = () => {
    setTimeout(() => setIsFocused(false), 200)
  }

  const container = {
    hidden: { opacity: 0, height: 0 },
    show: {
      opacity: 1,
      height: "auto",
      transition: {
        height: { duration: 0.3 },
        staggerChildren: 0.03,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        height: { duration: 0.2 },
        opacity: { duration: 0.15 },
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2 },
    },
    exit: {
      opacity: 0,
      y: -5,
      transition: { duration: 0.15 },
    },
  }

  const isSelected = (category: Category) => {
    return value.toLowerCase() === category.label.toLowerCase()
  }

  // Show custom input field when "Other" is selected
  if (showOtherInput) {
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MoreHorizontal className="w-4 h-4" />
          <span>Other category selected</span>
          <button 
            onClick={() => { setShowOtherInput(false); setCustomCategory(""); onChange(""); }}
            className="text-xs text-primary hover:underline ml-auto"
          >
            Change
          </button>
        </div>
        <Input
          type="text"
          placeholder="Enter your business category..."
          value={customCategory}
          onChange={handleCustomCategoryChange}
          autoFocus
          className="h-12 text-base bg-white border-border"
        />
      </div>
    )
  }

  return (
    <div className="w-full relative">
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full h-12 pl-10 pr-4 text-base rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <AnimatePresence mode="popLayout">
            {value ? (
              <motion.div
                key="building"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Building2 className="w-4 h-4 text-primary" />
              </motion.div>
            ) : (
              <motion.div
                key="search"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Search className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isFocused && (
          <motion.div
            className="absolute z-50 w-full mt-1 border border-border rounded-lg shadow-lg overflow-hidden bg-white max-h-64 overflow-y-auto"
            variants={container}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <motion.ul className="py-1">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <motion.li
                    key={category.id}
                    className={`px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected(category) ? "bg-primary/5" : ""
                    }`}
                    variants={item}
                    layout
                    onClick={() => handleSelectCategory(category)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0">{category.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {category.label}
                        </span>
                        {category.description && (
                          <span className="text-xs text-muted-foreground">
                            {category.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected(category) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0"
                      >
                        <Check className="w-4 h-4 text-primary" />
                      </motion.div>
                    )}
                  </motion.li>
                ))
              ) : (
                <motion.li
                  className="px-3 py-4 text-center"
                  variants={item}
                >
                  <p className="text-sm text-muted-foreground">No matching category</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select "Other" to enter a custom category
                  </p>
                </motion.li>
              )}
            </motion.ul>
            
            {query && !businessCategories.some(c => c.label.toLowerCase() === query.toLowerCase()) && filteredCategories.length > 0 && (
              <div className="px-3 py-2 border-t border-border bg-gray-50">
                <p className="text-xs text-muted-foreground">
                  Press Enter to use "<span className="font-medium text-foreground">{query}</span>" as custom category
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
