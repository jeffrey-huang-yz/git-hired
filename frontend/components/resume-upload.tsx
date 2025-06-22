"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, AlertCircle } from "lucide-react"
import type { JobPosting, Candidate } from "@/app/dashboard/page"
import { parseResumes } from "@/lib/resume-parser"
import { analyzeWithGemini } from "@/lib/gemini-analyzer"

interface ResumeUploadProps {
  job: JobPosting
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobUpdate: (job: JobPosting) => void
}

export function ResumeUpload({ job, open, onOpenChange, onJobUpdate }: ResumeUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
      setError(null)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files))
      setError(null)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const processResumes = async () => {
    if (files.length === 0) return

    setProcessing(true)
    setProgress(0)
    setResults([])
    setError(null)

    try {
      // Parse resumes and extract GitHub links
      setProgress(20)
      const parsedResumes = await parseResumes(files)

      setProgress(40)
      const candidates: Candidate[] = []

      // Process each resume
      for (let i = 0; i < parsedResumes.length; i++) {
        const resume = parsedResumes[i]
        setProgress(40 + (i / parsedResumes.length) * 40)

        if (resume.github_username) {
          // Analyze with Gemini
          const analysis = await analyzeWithGemini(resume, job)

          const newCandidatePayload = {
            name: resume.name,
            email: resume.email,
            github_username: resume.github_username,
            resumeText: resume.text,
            score: analysis.overallScore,
            githubAnalysis: analysis.githubAnalysis,
            jobId: job.id,
            extractedLinks: resume.links.map((link) => {
              let type = "other"
              if (link.includes("linkedin")) type = "linkedin"
              if (link.includes("github")) type = "github"
              if (link.includes("portfolio")) type = "portfolio"
              return { url: link, type }
            }),
            resumeFile: {
              type: resume.fileType,
              data: Buffer.from(resume.fileContent).toString("base64"),
            },
          }

          const response = await fetch("/api/candidates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newCandidatePayload),
          })

          if (!response.ok) {
            throw new Error("Failed to save candidate.")
          }

          const savedCandidate: Candidate = await response.json()
          candidates.push(savedCandidate)
          setResults((prev) => [...prev, `✅ Successfully processed ${resume.name}`])
        } else {
          setResults((prev) => [...prev, `⚠ No GitHub URL found for ${resume.name}`])
        }
      }

      const updatedJob = {
        ...job,
        candidateCount: job.candidateCount + candidates.length,
        status: "completed" as const,
      }
      onJobUpdate(updatedJob)

      setProgress(100)
      setResults((prev) => [...prev, `🎉 Successfully processed ${candidates.length} candidates`])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while processing resumes")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Resumes for {job.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Drop resume files here</p>
            <p className="text-gray-600 mb-4">or click to browse</p>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <Button asChild variant="outline">
              <label htmlFor="file-upload" className="cursor-pointer">
                Choose Files
              </label>
            </Button>
          </div>

          {files.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Selected Files ({files.length})</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4" />
                    {file.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing resumes...</span>
                <span className="text-sm text-gray-600">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Processing Results</h4>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="text-sm py-1">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={processResumes} disabled={files.length === 0 || processing}>
              {processing ? "Processing..." : "Process Resumes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
