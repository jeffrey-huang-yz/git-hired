"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Eye, Upload, Users } from "lucide-react"
import type { JobPosting } from "@/app/dashboard/page"
// import { ResumeUpload } from "@/components/resume-upload"

const ResumeUpload = dynamic(() => import("@/components/resume-upload").then(mod => mod.ResumeUpload), { ssr: false })

interface JobDetailsDialogProps {
  job: JobPosting
  onJobUpdate: (job: JobPosting) => void
  onViewResults: () => void
}

export function JobDetailsDialog({ job, onJobUpdate, onViewResults }: JobDetailsDialogProps) {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            View Details
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{job.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{job.description}</p>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Required Skills</h4>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {job.candidateCount} candidates
                </div>
                <div>Created: {job.createdAt.toLocaleDateString()}</div>
              </div>
              <Badge variant={job.status === "active" ? "default" : "secondary"}>{job.status}</Badge>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={() => setShowUpload(true)} className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Resumes
              </Button>
              {job.candidateCount > 0 && (
                <Button variant="outline" onClick={onViewResults}>
                  View Results
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ResumeUpload job={job} open={showUpload} onOpenChange={setShowUpload} onJobUpdate={onJobUpdate} />
    </>
  )
}
