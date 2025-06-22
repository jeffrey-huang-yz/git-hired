"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { JobPosting } from "@/app/dashboard/page"

interface JobPostingFormProps {
  onSubmit: (job: Omit<JobPosting, "id" | "createdAt" | "candidateCount" | "status">) => void
}

export function JobPostingForm({ onSubmit }: JobPostingFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [skillInput, setSkillInput] = useState("")
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])

  const addSkill = () => {
    if (skillInput.trim() && !requiredSkills.includes(skillInput.trim())) {
      setRequiredSkills([...requiredSkills, skillInput.trim()])
      setSkillInput("")
    }
  }

  const removeSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter((s) => s !== skill))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && description.trim() && requiredSkills.length > 0) {
      onSubmit({
        name: name.trim(),
        description: description.trim(),
        requiredSkills,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="job-name">Job Title</Label>
        <Input
          id="job-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Senior Frontend Developer"
          required
        />
      </div>

      <div>
        <Label htmlFor="job-description">Job Description</Label>
        <Textarea
          id="job-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the role, responsibilities, and requirements..."
          rows={6}
          required
        />
      </div>

      <div>
        <Label htmlFor="skills">Required Skills</Label>
        <div className="flex gap-2 mb-2">
          <Input
            id="skills"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            placeholder="e.g. React, TypeScript, Node.js"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
          />
          <Button type="button" onClick={addSkill} variant="outline">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {requiredSkills.map((skill) => (
            <Badge key={skill} variant="secondary" className="flex items-center gap-1">
              {skill}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeSkill(skill)} />
            </Badge>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full">
        Create Job Posting
      </Button>
    </form>
  )
}
