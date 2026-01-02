"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CheckIcon, ArrowRightIcon, User, Mail, Building2, Phone, Flag, Briefcase } from "lucide-react"
import { useCreateLead, Lead } from "@/hooks/use-leads"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { CategorySearch } from "@/components/ui/category-search"

type Step = {
  id: number
  label: string
  field: string
  placeholder: string
  icon: React.ReactNode
  type?: string
  required?: boolean
}

const steps: Step[] = [
  { id: 1, label: "Lead Name", field: "name", placeholder: "Enter the lead's full name", icon: <User className="w-4 h-4" />, required: true },
  { id: 2, label: "Email Address", field: "email", placeholder: "lead@example.com", icon: <Mail className="w-4 h-4" />, type: "email" },
  { id: 3, label: "Business Name", field: "business_name", placeholder: "Company or business name", icon: <Building2 className="w-4 h-4" /> },
  { id: 4, label: "Business Category", field: "business_category", placeholder: "e.g. Technology, Healthcare, Retail", icon: <Briefcase className="w-4 h-4" /> },
  { id: 5, label: "Phone Number", field: "phone", placeholder: "+1 (555) 000-0000", icon: <Phone className="w-4 h-4" />, type: "tel" },
  { id: 6, label: "Priority Level", field: "priority", placeholder: "normal", icon: <Flag className="w-4 h-4" /> },
]

interface AddLeadFormProps {
  onComplete: () => void
  onCancel: () => void
}

export function AddLeadForm({ onComplete, onCancel }: AddLeadFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, string>>({ priority: "normal" })
  const [isComplete, setIsComplete] = useState(false)
  const createLead = useCreateLead()
  const { user } = useAuth()
  const { toast } = useToast()

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Submit the form
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    createLead.mutate({
      name: formData.name,
      email: formData.email || null,
      business_name: formData.business_name || null,
      business_category: formData.business_category || null,
      phone: formData.phone || null,
      assigned_to: user?.id || null,
      status: "not_sure",
      interest_level: 50,
      priority: (formData.priority || "normal") as Lead["priority"],
      follow_up_status: "pending",
      last_contact: null,
      next_follow_up: null,
      notes: null,
      source: null,
    }, {
      onSuccess: () => {
        setIsComplete(true)
        toast({ title: "Lead Added!", description: `${formData.name} has been added successfully.` })
        setTimeout(() => {
          onComplete()
        }, 1500)
      },
      onError: (error) => {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
      }
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canProceed) {
      handleNext()
    }
  }

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100
  const canProceed = currentStepData.required ? formData[currentStepData.field]?.trim() : true

  if (isComplete) {
    return (
      <div className="w-full">
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/20 p-12 backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent_50%)]" />
          <div className="relative flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-700">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500/20 bg-green-500/10">
              <CheckIcon
                className="h-8 w-8 text-green-500 animate-in zoom-in duration-500 delay-200"
                strokeWidth={2.5}
              />
            </div>
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-medium tracking-tight text-balance">Lead Added Successfully!</h2>
              <p className="text-sm text-muted-foreground/80">{formData.name}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Step Indicators */}
      <div className="mb-8 flex items-center justify-center gap-2 flex-wrap">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-2">
            <button
              onClick={() => index < currentStep && setCurrentStep(index)}
              disabled={index > currentStep}
              className={cn(
                "group relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 ease-out",
                "disabled:cursor-not-allowed",
                index < currentStep && "bg-primary/20 text-primary",
                index === currentStep && "bg-primary text-primary-foreground shadow-lg",
                index > currentStep && "bg-muted/50 text-muted-foreground/40",
              )}
            >
              {index < currentStep ? (
                <CheckIcon className="h-4 w-4 animate-in zoom-in duration-500" strokeWidth={2.5} />
              ) : (
                <span className="text-xs font-medium tabular-nums">{step.id}</span>
              )}
              {index === currentStep && (
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-md animate-pulse" />
              )}
            </button>
            {index < steps.length - 1 && (
              <div className="relative h-[2px] w-6 hidden sm:block">
                <div className="absolute inset-0 bg-muted/50" />
                <div
                  className="absolute inset-0 bg-primary/50 transition-all duration-500 ease-out origin-left"
                  style={{
                    transform: `scaleX(${index < currentStep ? 1 : 0})`,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mb-6 overflow-hidden rounded-full bg-muted/30 h-1">
        <div
          className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Form Content */}
      <div className="space-y-6">
        <div key={currentStepData.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {currentStepData.icon}
              </div>
              <Label htmlFor={currentStepData.field} className="text-lg font-medium tracking-tight">
                {currentStepData.label}
                {currentStepData.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>
            <span className="text-xs font-medium text-muted-foreground/60 tabular-nums bg-muted/50 px-2 py-1 rounded">
              {currentStep + 1}/{steps.length}
            </span>
          </div>

          {/* Special handling for Priority field */}
          {currentStepData.field === "priority" ? (
            <div className="grid grid-cols-2 gap-3">
              {["low", "normal", "high", "urgent"].map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => handleInputChange("priority", priority)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all duration-300 text-left",
                    formData.priority === priority
                      ? priority === "urgent" ? "border-red-500 bg-red-50 text-red-700"
                        : priority === "high" ? "border-orange-500 bg-orange-50 text-orange-700"
                        : priority === "normal" ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-400 bg-gray-50 text-gray-700"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Flag className={cn(
                      "w-4 h-4",
                      priority === "urgent" && "text-red-500",
                      priority === "high" && "text-orange-500",
                      priority === "normal" && "text-blue-500",
                      priority === "low" && "text-gray-400"
                    )} />
                    <span className="font-medium capitalize">{priority}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {priority === "urgent" && "Needs immediate attention"}
                    {priority === "high" && "Important, follow up soon"}
                    {priority === "normal" && "Standard priority"}
                    {priority === "low" && "Can wait, no rush"}
                  </p>
                </button>
              ))}
            </div>
          ) : currentStepData.field === "business_category" ? (
            <CategorySearch
              value={formData.business_category || ""}
              onChange={(value) => handleInputChange("business_category", value)}
              placeholder="Search or select a business category..."
            />
          ) : (
            <div className="relative group">
              <Input
                id={currentStepData.field}
                type={currentStepData.type || "text"}
                placeholder={currentStepData.placeholder}
                value={formData[currentStepData.field] || ""}
                onChange={(e) => handleInputChange(currentStepData.field, e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="h-14 text-base transition-all duration-300 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur pl-4"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handleNext}
            disabled={!canProceed || createLead.isPending}
            className="w-full h-12 group relative transition-all duration-300 hover:shadow-lg"
          >
            <span className="flex items-center justify-center gap-2 font-medium">
              {createLead.isPending ? (
                "Adding Lead..."
              ) : currentStep === steps.length - 1 ? (
                "Add Lead"
              ) : (
                "Continue"
              )}
              {!createLead.isPending && (
                <ArrowRightIcon
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5 duration-300"
                  strokeWidth={2}
                />
              )}
            </span>
          </Button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 text-center text-sm text-muted-foreground/60 hover:text-foreground/80 transition-all duration-300 py-2"
              >
                Go back
              </button>
            )}
            {!currentStepData.required && currentStep < steps.length - 1 && (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex-1 text-center text-sm text-muted-foreground/60 hover:text-foreground/80 transition-all duration-300 py-2"
              >
                Skip this step
              </button>
            )}
          </div>

          <button
            onClick={onCancel}
            className="w-full text-center text-sm text-muted-foreground/40 hover:text-red-500 transition-all duration-300 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
