"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, FileText, Trash2 } from "lucide-react"
import { JobPostingForm } from "@/components/job-posting-form"
import { ResultsDialog } from "@/components/results-dialog"

const JobDetailsDialog = dynamic(() => import("@/components/job-details-dialog").then(mod => mod.JobDetailsDialog), {
  ssr: false,
})

export interface JobPosting {
  id: string
  name: string
  description: string
  requiredSkills: string[]
  createdAt: Date
  candidateCount: number
  status: "active" | "processing" | "completed"
}

export interface Candidate {
  id: string
  name: string
  email: string
  github_username: string
  resumeText: string
  score: number
  githubAnalysis: GitHubAnalysis
  jobId: string
  extractedLinks?: ExtractedLink[]
  resumeFileId?: string
  resumeFileType?: string
}

export interface ExtractedLink {
  type: string
  url: string
}

export interface GitHubAnalysis {
  repositories: Repository[]
  languages: { [key: string]: number }
  languageProficiency?: { [key: string]: any }
  totalCommits: number
  totalStars: number
  totalLinesOfCode?: number
  profileScore: number
  relevanceScore: number
  technicalScore?: number
  codeQualityScore?: number
  activityScore?: number
  skillsMatch: string[]
  skillProficiency?: { [key: string]: number }
  readmeComparison?: ReadmeComparison[]
}

export interface ReadmeComparison {
  repository: string
  similarityScore: number
  summary: string
  keyMatches: string[]
}

export interface Repository {
  name: string
  description: string
  language: string
  stars: number
  commits: number
  readme: string
  relevanceScore: number
  codeQualityScore?: number
  linesOfCode?: number
  fileCount?: number
  complexityScore?: number
  technologies?: string[]
  codeIssues?: string[]
}

export default function Dashboard() {
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([])
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [showJobForm, setShowJobForm] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)
  useEffect(() => {
    // Load job postings from localStorage
    const saved = localStorage.getItem("jobPostings")
    if (saved) {
      const parsedJobs = JSON.parse(saved).map((job: any) => ({
        ...job,
        createdAt: new Date(job.createdAt), // Convert string back to Date object
      }))
      setJobPostings(parsedJobs)
    }
  }, [])

  const handleCreateJob = (job: Omit<JobPosting, "id" | "createdAt" | "candidateCount" | "status">) => {
    const newJob: JobPosting = {
      ...job,
      id: Date.now().toString(),
      createdAt: new Date(),
      candidateCount: 0,
      status: "active",
    }
    const updated = [...jobPostings, newJob]
    setJobPostings(updated)
    localStorage.setItem("jobPostings", JSON.stringify(updated))
    setShowJobForm(false)
  }

  const handleDeleteJob = (jobId: string) => {
    // Remove job posting
    const updatedJobs = jobPostings.filter((job) => job.id !== jobId)
    setJobPostings(updatedJobs)
    localStorage.setItem("jobPostings", JSON.stringify(updatedJobs))

    // Remove associated candidates
    const existingCandidates = JSON.parse(localStorage.getItem("candidates") || "[]")
    const updatedCandidates = existingCandidates.filter((candidate: Candidate) => candidate.jobId !== jobId)
    localStorage.setItem("candidates", JSON.stringify(updatedCandidates))

    setDeleteJobId(null)
  }

  const handleJobUpdate = (updatedJob: JobPosting) => {
    const updated = jobPostings.map((job) => (job.id === updatedJob.id ? updatedJob : job))
    setJobPostings(updated)
    localStorage.setItem("jobPostings", JSON.stringify(updated))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recruitment Dashboard</h1>
            <p className="text-gray-600 mt-2">Analyze candidates using AI-powered GitHub profile matching</p>
          </div>
          <Dialog open={showJobForm} onOpenChange={setShowJobForm}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Job Posting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Job Posting</DialogTitle>
              </DialogHeader>
              <JobPostingForm onSubmit={handleCreateJob} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobPostings.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{job.name}</CardTitle>
                    <CardDescription className="mt-2">{job.description.substring(0, 100)}...</CardDescription>
                  </div>
                  <Badge
                    variant={
                      job.status === "active" ? "default" : job.status === "processing" ? "secondary" : "outline"
                    }
                  >
                    {job.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-4">
                  {job.requiredSkills.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {job.requiredSkills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{job.requiredSkills.length - 3} more
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {job.candidateCount} candidates
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {job.createdAt.toLocaleDateString()}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <JobDetailsDialog
                    job={job}
                    onJobUpdate={handleJobUpdate}
                    onViewResults={() => {
                      setSelectedJob(job)
                      setShowResults(true)
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {jobPostings.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No job postings yet</h3>
            <p className="text-gray-600 mb-4">Create your first job posting to start analyzing candidates</p>
            <Button onClick={() => setShowJobForm(true)}>Create Job Posting</Button>
          </div>
        )}

        {selectedJob && <ResultsDialog job={selectedJob} open={showResults} onOpenChange={setShowResults} />}

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteJobId} onOpenChange={() => setDeleteJobId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Job Posting</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete this job posting? This action will also remove all associated candidates
                and cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteJobId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteJobId && handleDeleteJob(deleteJobId)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Job
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
