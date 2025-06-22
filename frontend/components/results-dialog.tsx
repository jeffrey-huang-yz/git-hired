"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Github,
  Star,
  GitCommit,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Code,
  TrendingUp,
} from "lucide-react"

// Backend API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 

// Type definitions
interface JobPosting {
  id: string
  name: string
  description: string
  requiredSkills: string[]
  niceToHave?: string[]
  candidateCount?: number
  status?: "draft" | "active" | "completed"
}

interface ExtractedLink {
  url: string
  type: string
}

interface Repository {
  name: string
  description: string
  language: string
  stars: number
  commits: number
  relevanceScore: number
  codeQualityScore: number
  linesOfCode: number
  fileCount: number
  complexityScore: number
  technologies: string[]
  codeIssues: string[]
}

interface ReadmeComparison {
  repository: string
  similarityScore: number
  summary: string
  keyMatches: string[]
}

interface CodeProficiencyData {
  username: string
  overall_score: number
  proficiency_level: string
  language_scores: Record<string, number>
  complexity_analysis: {
    avg_complexity: number
    high_complexity_files: number
    total_files_analyzed: number
  }
  code_quality_metrics: {
    avg_function_length: number
    avg_cyclomatic_complexity: number
    code_duplication_score: number
    maintainability_score: number
  }
  best_practices_score: number
  repository_analysis: Array<{
    repo_name: string
    language: string
    score: number
    complexity_score: number
    quality_metrics: {
      function_count: number
      avg_function_length: number
      cyclomatic_complexity: number
    }
    issues: string[]
    strengths: string[]
  }>
  recommendations: string[]
  analysis_summary: {
    total_repos_analyzed: number
    total_files_analyzed: number
    languages_detected: string[]
    analysis_duration: number
  }
}

interface Candidate {
  id: string
  name: string
  email: string
  githubUrl: string
  githubUsername?: string
  github_username?: string
  resumeText: string
  resumeFileId?: string
  resumeFileType?: string
  score: number
  jobId: string
  githubAnalysis: {
    technicalScore: number
    relevanceScore: number
    codeQualityScore: number
    activityScore: number
    totalStars: number
    totalLinesOfCode: number
    repositories: Repository[]
    languageProficiency: Record<string, { score: number; linesOfCode: number; repositories: number }>
    skillsMatch: string[]
    skillProficiency: Record<string, number>
    readmeComparison?: ReadmeComparison[]
  }
  extractedLinks?: ExtractedLink[]
  // Backend analysis data
  deepAnalysis?: any
  readmeAnalysis?: any
  matchingResults?: any
  activityData?: any
  codeProficiency?: CodeProficiencyData
}

interface ResultsDialogProps {
  job: JobPosting
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Helper functions
const getGitHubUsername = (candidate: Candidate): string => {
  const username = candidate.github_username || candidate.githubUsername || ""
  return username
}

const extractUsernameFromUrl = (githubUrl: string): string => {
  if (!githubUrl) return ""
  const match = githubUrl.match(/github\.com\/([^/]+)/)
  return match ? match[1] : ""
}

export function ResultsDialog({ job, open, onOpenChange }: ResultsDialogProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch candidates and perform comprehensive analysis
  useEffect(() => {
    if (open) {
      fetchAndAnalyzeCandidates()
    }
  }, [open, job.id])

  const fetchAndAnalyzeCandidates = async () => {
    setLoading(true)
    setError(null)
    setAnalyzing("Fetching candidates...")

    try {
      // Fetch candidates from backend API
      const candidatesResponse = await fetch(`${API_BASE_URL}/api/candidates?jobId=${job.id}`)

      if (!candidatesResponse.ok) {
        throw new Error("Failed to fetch candidates")
      }

      const jobCandidates: Candidate[] = await candidatesResponse.json()

      if (jobCandidates.length === 0) {
        setError("No candidates found for this job")
        setLoading(false)
        return
      }

      console.log(`Found ${jobCandidates.length} candidates for analysis`)

      // Analyze each candidate with comprehensive backend analysis
      const analyzedCandidates: Candidate[] = []

      for (const candidate of jobCandidates) {
        const githubUsername = getGitHubUsername(candidate) || extractUsernameFromUrl(candidate.githubUrl)

        if (!githubUsername) {
          console.log(`No GitHub username found for ${candidate.name}`)
          // Add candidate without analysis
          analyzedCandidates.push({
            ...candidate,
            score: 0,
            githubAnalysis: {
              technicalScore: 0,
              relevanceScore: 0,
              codeQualityScore: 0,
              activityScore: 0,
              totalStars: 0,
              totalLinesOfCode: 0,
              repositories: [],
              languageProficiency: {},
              skillsMatch: [],
              skillProficiency: {},
            },
          })
          continue
        }

        setAnalyzing(`Analyzing ${candidate.name} (${githubUsername})...`)

        try {
          // Perform comprehensive analysis using backend APIs
          const analysisResults = await performComprehensiveBackendAnalysis(githubUsername, candidate, job)
          analyzedCandidates.push(analysisResults)
        } catch (analysisError) {
          console.error(`Analysis failed for ${githubUsername}:`, analysisError)
          // Add candidate with basic info but no analysis
          analyzedCandidates.push({
            ...candidate,
            score: 0,
            githubAnalysis: {
              technicalScore: 0,
              relevanceScore: 0,
              codeQualityScore: 0,
              activityScore: 0,
              totalStars: 0,
              totalLinesOfCode: 0,
              repositories: [],
              languageProficiency: {},
              skillsMatch: [],
              skillProficiency: {},
            },
          })
        }
      }

      // Sort by score
      analyzedCandidates.sort((a, b) => b.score - a.score)
      setCandidates(analyzedCandidates)

      if (analyzedCandidates.length > 0) {
        setSelectedCandidate(analyzedCandidates[0])
      }
    } catch (error) {
      console.error("Error fetching candidates:", error)
      setError("Failed to analyze candidates")
    } finally {
      setLoading(false)
      setAnalyzing(null)
    }
  }

  const performComprehensiveBackendAnalysis = async (
    username: string,
    candidate: Candidate,
    job: JobPosting,
  ): Promise<Candidate> => {
    try {
      console.log(`Starting comprehensive analysis for ${username}`)

      // 1. Deep GitHub Analysis
      setAnalyzing(`Deep GitHub analysis for ${candidate.name}...`)
      const deepAnalysisResponse = await fetch(`${API_BASE_URL}/deep-search/${username}`)
      const deepAnalysis = deepAnalysisResponse.ok ? await deepAnalysisResponse.json() : null

      // 2. Activity Score Analysis
      setAnalyzing(`Activity scoring for ${candidate.name}...`)
      const activityResponse = await fetch(`${API_BASE_URL}/activity-score/${username}`)
      const activityData = activityResponse.ok ? await activityResponse.json() : null

      // 3. README Quality Analysis
      setAnalyzing(`README analysis for ${candidate.name}...`)
      const readmeResponse = await fetch(`${API_BASE_URL}/readme-analysis/${username}`)
      const readmeAnalysis = readmeResponse.ok ? await readmeResponse.json() : null

      // 4. Code Proficiency Analysis (NEW)
      setAnalyzing(`Code proficiency analysis for ${candidate.name}...`)
      const codeProficiencyResponse = await fetch(`${API_BASE_URL}/code-proficiency/${username}`)
      const codeProficiency = codeProficiencyResponse.ok ? await codeProficiencyResponse.json() : null

      // 5. AI-Powered Job Matching
      setAnalyzing(`AI job matching for ${candidate.name}...`)
      const matchingPayload = {
        job_description: job.description,
        required_skills: job.requiredSkills,
        nice_to_have: job.niceToHave || [],
        candidate_data: {
          top_repos: deepAnalysis?.repo_details?.slice(0, 10) || [],
          detected_skills: deepAnalysis?.skills_analysis?.all_inferred_skills || {},
          top_languages: deepAnalysis?.language_distribution || {},
        },
      }

      const matchingResponse = await fetch(`${API_BASE_URL}/match-candidate-ai/${username}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(matchingPayload),
      })
      const matchingResults = matchingResponse.ok ? await matchingResponse.json() : null

      // Calculate comprehensive scores using backend data
      const technicalScore = calculateTechnicalScore(deepAnalysis, codeProficiency)
      const relevanceScore = matchingResults?.total_match_percentage || 0
      const codeQualityScore = calculateCodeQualityScore(readmeAnalysis, codeProficiency)
      const activityScore = activityData?.activity_score || 0

      // Calculate overall score (weighted) - now includes code proficiency
      const overallScore = Math.round(
        technicalScore * 0.35 + relevanceScore * 0.3 + codeQualityScore * 0.25 + activityScore * 0.1,
      )

      // Transform backend data to match frontend interface
      const githubAnalysis = {
        technicalScore,
        relevanceScore,
        codeQualityScore,
        activityScore,
        totalStars: deepAnalysis?.popularity_metrics?.total_stars || 0,
        totalLinesOfCode:
          deepAnalysis?.repo_details?.reduce((sum: number, repo: any) => sum + (repo.linesOfCode || 0), 0) || 0,
        repositories: transformRepositories(deepAnalysis?.repo_details || [], matchingResults),
        languageProficiency: transformLanguageProficiency(
          deepAnalysis?.language_distribution,
          deepAnalysis?.commits_per_language,
          codeProficiency?.language_scores,
        ),
        skillsMatch: calculateSkillsMatch(job.requiredSkills, deepAnalysis?.skills_analysis?.all_inferred_skills || {}),
        skillProficiency: deepAnalysis?.skills_analysis?.all_inferred_skills || {},
        readmeComparison: transformReadmeComparison(readmeAnalysis?.readme_analyses || []),
      }

      console.log(`Analysis completed for ${username} with score: ${overallScore}`)

      return {
        ...candidate,
        score: overallScore,
        githubAnalysis,
        deepAnalysis,
        readmeAnalysis,
        matchingResults,
        activityData,
        codeProficiency,
      }
    } catch (error) {
      console.error(`Comprehensive analysis failed for ${username}:`, error)
      throw error
    }
  }

  // Helper functions for data transformation
  const calculateTechnicalScore = (deepAnalysis: any, codeProficiency: any): number => {
    if (!deepAnalysis) return 0

    const languageCount = Object.keys(deepAnalysis.language_distribution || {}).length
    const skillCount = Object.keys(deepAnalysis.skills_analysis?.all_inferred_skills || {}).length
    const avgStars = deepAnalysis.popularity_metrics?.avg_stars_per_repo || 0
    const totalCommits = deepAnalysis.activity_metrics?.total_commits || 0
    const codeScore = codeProficiency?.overall_score || 0

    // Enhanced technical scoring with code proficiency
    const languageScore = Math.min(languageCount * 8, 25)
    const skillScore = Math.min(skillCount * 1.5, 30)
    const popularityScore = Math.min(avgStars * 4, 15)
    const activityScore = Math.min(totalCommits / 60, 10)
    const proficiencyScore = Math.min(codeScore / 5, 20) // Code proficiency contributes 20%

    return Math.round(languageScore + skillScore + popularityScore + activityScore + proficiencyScore)
  }

  const calculateCodeQualityScore = (readmeAnalysis: any, codeProficiency: any): number => {
    const readmeScore = readmeAnalysis?.overall_readme_score || 0
    const codeQualityScore = codeProficiency?.code_quality_metrics?.maintainability_score || 0
    const bestPracticesScore = codeProficiency?.best_practices_score || 0

    // Weighted combination of README quality and code quality metrics
    return Math.round(readmeScore * 0.4 + codeQualityScore * 0.4 + bestPracticesScore * 0.2)
  }

  const transformRepositories = (repoDetails: any[], matchingResults: any): Repository[] => {
    return (repoDetails || []).map((repo: any) => ({
      name: repo.name || "",
      description: repo.description || "",
      language: repo.language || "",
      stars: repo.stars || 0,
      commits: repo.commits || 0,
      relevanceScore: matchingResults?.repo_matches?.find((m: any) => m.repo_name === repo.name)?.match_percentage || 0,
      codeQualityScore: Math.min((repo.readme_content?.length || 0) / 10, 100),
      linesOfCode: repo.linesOfCode || 0,
      fileCount: repo.fileCount || 0,
      complexityScore: repo.complexityScore || 0,
      technologies: repo.detected_skills || [],
      codeIssues: [],
    }))
  }

  const transformLanguageProficiency = (langDist: any, commitsDist: any, codeScores: any) => {
    const result: Record<string, { score: number; linesOfCode: number; repositories: number }> = {}

    if (langDist) {
      Object.entries(langDist).forEach(([lang, repoCount]) => {
        const commits = commitsDist?.[lang] || 0
        const codeScore = codeScores?.[lang] || 0
        result[lang] = {
          score: Math.min((repoCount as number) * 15 + (commits as number) / 15 + codeScore / 2, 100),
          linesOfCode: (commits as number) * 50, // Estimate
          repositories: repoCount as number,
        }
      })
    }

    return result
  }

  const calculateSkillsMatch = (requiredSkills: string[], detectedSkills: Record<string, number>): string[] => {
    return requiredSkills.filter((skill) =>
      Object.keys(detectedSkills).some((detectedSkill) => detectedSkill.toLowerCase().includes(skill.toLowerCase())),
    )
  }

  const transformReadmeComparison = (readmeAnalyses: any[]): ReadmeComparison[] => {
    return (readmeAnalyses || []).slice(0, 5).map((analysis: any) => ({
      repository: analysis.repo_name,
      similarityScore: analysis.readme_score,
      summary: analysis.feedback,
      keyMatches: analysis.strengths,
    }))
  }

  // UI helper functions
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  const getCodeQualityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4 text-green-600" />
    if (score >= 60) return <AlertTriangle className="w-4 h-4 text-yellow-600" />
    return <XCircle className="w-4 h-4 text-red-600" />
  }

  const getProficiencyLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "expert":
        return "text-purple-600"
      case "advanced":
        return "text-blue-600"
      case "intermediate":
        return "text-green-600"
      case "beginner":
        return "text-yellow-600"
      default:
        return "text-gray-600"
    }
  }

  const formatUrl = (url: string) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url
    }
    return `//${url}`
  }

  // Loading state
  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Analyzing Candidates</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm text-gray-600 text-center">
              {analyzing || "Performing comprehensive GitHub analysis..."}
            </p>
            <p className="text-xs text-gray-500 text-center">This may take a few minutes for detailed analysis</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Error state
  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Analysis Error</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-gray-600 text-center">{error}</p>
            <Button onClick={fetchAndAnalyzeCandidates} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Analysis
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Main dialog content
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Analysis Results - {job.name}</span>
            <Button onClick={fetchAndAnalyzeCandidates} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Analysis
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[calc(90vh-120px)]">
          {/* Candidates List */}
          <div className="w-1/3 border-r pr-6">
            <h3 className="font-semibold mb-4">Candidates ({candidates.length})</h3>
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <Card
                    key={candidate.id}
                    className={`cursor-pointer transition-colors ${
                      selectedCandidate?.id === candidate.id ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-sm">{candidate.name}</CardTitle>
                            <CardDescription className="text-xs">{candidate.email}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={getScoreBadgeVariant(candidate.score)}>{candidate.score}/100</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <Github className="w-3 h-3" />
                        <span className="truncate">
                          {getGitHubUsername(candidate) ||
                            extractUsernameFromUrl(candidate.githubUrl) ||
                            "No GitHub found"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        {getCodeQualityIcon(candidate.githubAnalysis.codeQualityScore || 0)}
                        <span>Code Quality: {candidate.githubAnalysis.codeQualityScore || 0}/100</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <Code className="w-3 h-3" />
                        <span
                          className={getProficiencyLevelColor(candidate.codeProficiency?.proficiency_level || "novice")}
                        >
                          {candidate.codeProficiency?.proficiency_level || "Unknown"} Level
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <Star className="w-3 h-3" />
                        <span>Total Stars: {candidate.githubAnalysis.totalStars}</span>
                      </div>
                      <Progress value={candidate.score} className="h-1" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Candidate Details */}
          {selectedCandidate && (
            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="overview" className="h-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="resume">Resume</TabsTrigger>
                  <TabsTrigger value="github">GitHub Analysis</TabsTrigger>
                  <TabsTrigger value="comparison">Job Matching</TabsTrigger>
                  <TabsTrigger value="insights">AI Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Avatar>
                          <AvatarFallback>{selectedCandidate.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {selectedCandidate.name}
                        <Badge variant={getScoreBadgeVariant(selectedCandidate.score)} className="ml-auto">
                          Overall Score: {selectedCandidate.score}/100
                        </Badge>
                      </CardTitle>
                      <CardDescription>{selectedCandidate.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">GitHub Profile</h4>
                          {getGitHubUsername(selectedCandidate) ||
                          extractUsernameFromUrl(selectedCandidate.githubUrl) ? (
                            <a
                              href={`https://github.com/${getGitHubUsername(selectedCandidate) || extractUsernameFromUrl(selectedCandidate.githubUrl)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Github className="w-4 h-4" />
                              {getGitHubUsername(selectedCandidate) ||
                                extractUsernameFromUrl(selectedCandidate.githubUrl)}
                            </a>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Github className="w-4 h-4" />
                              <span className="text-sm">No GitHub profile found</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Profile Stats</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Total Repositories:</span>
                              <span>
                                {selectedCandidate.deepAnalysis?.user_info?.public_repos ||
                                  selectedCandidate.githubAnalysis.repositories.length}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Stars:</span>
                              <span>{selectedCandidate.githubAnalysis.totalStars}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Commits:</span>
                              <span>{selectedCandidate.deepAnalysis?.activity_metrics?.total_commits || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Primary Language:</span>
                              <span>{selectedCandidate.deepAnalysis?.insights?.primary_language || "Unknown"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Code Proficiency:</span>
                              <span
                                className={getProficiencyLevelColor(
                                  selectedCandidate.codeProficiency?.proficiency_level || "novice",
                                )}
                              >
                                {selectedCandidate.codeProficiency?.proficiency_level || "Unknown"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Enhanced Score Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Technical Proficiency (35%)</span>
                            <span className="text-sm">{selectedCandidate.githubAnalysis.technicalScore}/100</span>
                          </div>
                          <Progress value={selectedCandidate.githubAnalysis.technicalScore} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Job Relevance (30%)</span>
                            <span className="text-sm">{selectedCandidate.githubAnalysis.relevanceScore}/100</span>
                          </div>
                          <Progress value={selectedCandidate.githubAnalysis.relevanceScore} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Code Quality (25%)</span>
                            <span className="text-sm">{selectedCandidate.githubAnalysis.codeQualityScore}/100</span>
                          </div>
                          <Progress value={selectedCandidate.githubAnalysis.codeQualityScore} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Activity & Growth (10%)</span>
                            <span className="text-sm">{selectedCandidate.githubAnalysis.activityScore}/100</span>
                          </div>
                          <Progress value={selectedCandidate.githubAnalysis.activityScore} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="resume" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Resume</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedCandidate.resumeFileId ? (
                        <>
                          {selectedCandidate.resumeFileType === "application/pdf" ? (
                            <iframe
                              src={`${API_BASE_URL}/api/resumes/${selectedCandidate.id}`}
                              className="w-full h-[600px]"
                              title={`${selectedCandidate.name}'s resume`}
                            />
                          ) : (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">
                                This file type cannot be displayed in the browser.
                              </p>
                              <a
                                href={`${API_BASE_URL}/api/resumes/${selectedCandidate.id}`}
                                download={selectedCandidate.name.replace(/\s/g, "_") + "_resume"}
                                className="text-blue-600 hover:underline"
                              >
                                Download Resume
                              </a>
                            </div>
                          )}
                        </>
                      ) : (
                        <ScrollArea className="h-96">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {selectedCandidate.resumeText}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Extracted Links</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedCandidate.extractedLinks?.map((link, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Badge variant="outline">{link.type}</Badge>
                            <a
                              href={formatUrl(link.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {link.url}
                            </a>
                          </div>
                        )) || <p className="text-gray-500 text-sm">No additional links found</p>}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="github" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Programming Languages & Proficiency</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(selectedCandidate.githubAnalysis.languageProficiency || {}).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(selectedCandidate.githubAnalysis.languageProficiency || {})
                            .sort(([, a], [, b]) => (b as any).score - (a as any).score)
                            .slice(0, 8)
                            .map(([language, data]) => {
                              const proficiency = data as any
                              return (
                                <div key={language} className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">{language}</span>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {proficiency.repositories} repos
                                      </Badge>
                                    </div>
                                  </div>
                                  <Progress value={proficiency.score} />
                                </div>
                              )
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Github className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No GitHub analysis data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Repository Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedCandidate.githubAnalysis.repositories.length > 0 ? (
                        <ScrollArea className="h-96">
                          <div className="space-y-4">
                            {selectedCandidate.githubAnalysis.repositories
                              .sort((a, b) => b.stars - a.stars)
                              .slice(0, 10)
                              .map((repo) => (
                                <div key={repo.name} className="border rounded-lg p-4">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <h4 className="font-medium">{repo.name}</h4>
                                      <p className="text-sm text-gray-600 mt-1">{repo.description}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <Badge variant="outline">Relevance: {repo.relevanceScore}/100</Badge>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                      <h5 className="text-sm font-medium mb-1">Technologies</h5>
                                      <div className="flex flex-wrap gap-1">
                                        {repo.technologies?.slice(0, 5).map((tech) => (
                                          <Badge key={tech} variant="secondary" className="text-xs">
                                            {tech}
                                          </Badge>
                                        )) || (
                                          <Badge variant="secondary" className="text-xs">
                                            {repo.language}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-medium mb-1">Metrics</h5>
                                      <div className="text-xs text-gray-600 space-y-1">
                                        <div>Stars: {repo.stars}</div>
                                        <div>Commits: {repo.commits}</div>
                                        <div>Language: {repo.language}</div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3 h-3" />
                                      {repo.stars}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <GitCommit className="w-3 h-3" />
                                      {repo.commits} commits
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {getCodeQualityIcon(repo.codeQualityScore)}
                                      Quality Score
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <GitCommit className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No repository data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="code-proficiency" className="space-y-4">
                  {selectedCandidate.codeProficiency ? (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Code className="w-5 h-5" />
                            Code Proficiency Overview
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                              <div className="text-3xl font-bold text-blue-600 mb-2">
                                {selectedCandidate.codeProficiency.overall_score}/100
                              </div>
                              <div className="text-sm text-blue-800 mb-1">Overall Code Score</div>
                              <Badge
                                variant="outline"
                                className={`${getProficiencyLevelColor(selectedCandidate.codeProficiency.proficiency_level)} border-current`}
                              >
                                {selectedCandidate.codeProficiency.proficiency_level}
                              </Badge>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm">Code Quality</span>
                                  <span className="text-sm">
                                    {selectedCandidate.codeProficiency.code_quality_metrics?.maintainability_score || 0}
                                    /100
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    selectedCandidate.codeProficiency.code_quality_metrics?.maintainability_score || 0
                                  }
                                />
                              </div>
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm">Best Practices</span>
                                  <span className="text-sm">
                                    {selectedCandidate.codeProficiency.best_practices_score || 0}/100
                                  </span>
                                </div>
                                <Progress value={selectedCandidate.codeProficiency.best_practices_score || 0} />
                              </div>
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm">Complexity Management</span>
                                  <span className="text-sm">
                                    {Math.max(
                                      0,
                                      100 -
                                        (selectedCandidate.codeProficiency.complexity_analysis?.avg_complexity || 0) *
                                          10,
                                    )}
                                    /100
                                  </span>
                                </div>
                                <Progress
                                  value={Math.max(
                                    0,
                                    100 -
                                      (selectedCandidate.codeProficiency.complexity_analysis?.avg_complexity || 0) * 10,
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Language-Specific Proficiency</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Object.entries(selectedCandidate.codeProficiency.language_scores || {})
                              .sort(([, a], [, b]) => (b as number) - (a as number))
                              .slice(0, 8)
                              .map(([language, score]) => (
                                <div key={language} className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">{language}</span>
                                    <span className="text-sm">{Math.round(score as number)}/100</span>
                                  </div>
                                  <Progress value={score as number} />
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Code Quality Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm">Avg Function Length:</span>
                                <span className="text-sm font-medium">
                                  {selectedCandidate.codeProficiency.code_quality_metrics?.avg_function_length || 0}{" "}
                                  lines
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Cyclomatic Complexity:</span>
                                <span className="text-sm font-medium">
                                  {selectedCandidate.codeProficiency.code_quality_metrics?.avg_cyclomatic_complexity ||
                                    0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Code Duplication:</span>
                                <span className="text-sm font-medium">
                                  {selectedCandidate.codeProficiency.code_quality_metrics?.code_duplication_score || 0}%
                                </span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm">Total Files Analyzed:</span>
                                <span className="text-sm font-medium">
                                  {selectedCandidate.codeProficiency.analysis_summary?.total_files_analyzed || 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Repositories Analyzed:</span>
                                <span className="text-sm font-medium">
                                  {selectedCandidate.codeProficiency.analysis_summary?.total_repos_analyzed || 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Languages Detected:</span>
                                <span className="text-sm font-medium">
                                  {selectedCandidate.codeProficiency.analysis_summary?.languages_detected?.length || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Repository Code Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-64">
                            <div className="space-y-3">
                              {selectedCandidate.codeProficiency.repository_analysis
                                ?.slice(0, 10)
                                .map((repo, index) => (
                                  <div key={index} className="border rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-2">
                                      <h5 className="font-medium">{repo.repo_name}</h5>
                                      <div className="flex gap-2">
                                        <Badge variant="outline">{repo.language}</Badge>
                                        <Badge variant={repo.score >= 70 ? "default" : "secondary"}>
                                          {repo.score}/100
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                      <div>
                                        <div>Functions: {repo.quality_metrics?.function_count || 0}</div>
                                        <div>Avg Function Length: {repo.quality_metrics?.avg_function_length || 0}</div>
                                      </div>
                                      <div>
                                        <div>Complexity: {repo.quality_metrics?.cyclomatic_complexity || 0}</div>
                                        <div>Complexity Score: {repo.complexity_score || 0}/100</div>
                                      </div>
                                    </div>
                                    {repo.strengths && repo.strengths.length > 0 && (
                                      <div className="mt-2">
                                        <div className="text-xs text-green-600">
                                          <strong>Strengths:</strong> {repo.strengths.slice(0, 2).join(", ")}
                                        </div>
                                      </div>
                                    )}
                                    {repo.issues && repo.issues.length > 0 && (
                                      <div className="mt-1">
                                        <div className="text-xs text-red-600">
                                          <strong>Issues:</strong> {repo.issues.slice(0, 2).join(", ")}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )) || <p className="text-gray-500 text-sm">No repository analysis available</p>}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {selectedCandidate.codeProficiency.recommendations?.map((rec, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{rec}</span>
                              </div>
                            )) || <p className="text-gray-500 text-sm">No recommendations available</p>}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-gray-500">No code proficiency analysis available</p>
                        <p className="text-xs text-gray-400 mt-2">
                          Code analysis requires access to repository contents
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="comparison" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Skills Match Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {job.requiredSkills.map((skill) => {
                            const isMatched = selectedCandidate.githubAnalysis.skillsMatch.includes(skill)
                            const proficiency = selectedCandidate.githubAnalysis.skillProficiency?.[skill] || 0
                            return (
                              <div key={skill} className="flex items-center gap-2">
                                <Badge
                                  variant={isMatched ? "default" : "outline"}
                                  className={isMatched ? "bg-green-100 text-green-800" : ""}
                                >
                                  {skill} {isMatched && "✓"}
                                </Badge>
                                {isMatched && (
                                  <span className="text-xs text-gray-600">
                                    ({Math.round(proficiency as number)}/100)
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-gray-600">
                            Matched {selectedCandidate.githubAnalysis.skillsMatch.length} out of{" "}
                            {job.requiredSkills.length} required skills
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedCandidate.matchingResults && (
                    <Card>
                      <CardHeader>
                        <CardTitle>AI-Powered Repository Matching</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {selectedCandidate.matchingResults.total_match_percentage}%
                            </div>
                            <div className="text-sm text-blue-800">Overall Job Match</div>
                          </div>

                          <div className="space-y-2">
                            <h5 className="font-medium">Repository Match Breakdown:</h5>
                            {selectedCandidate.matchingResults.repo_matches
                              .slice(0, 8)
                              .map((match: any, index: number) => (
                                <div key={index} className="flex justify-between items-center p-2 border rounded">
                                  <span className="text-sm font-medium">{match.repo_name}</span>
                                  <Badge
                                    variant={
                                      match.match_percentage >= 70
                                        ? "default"
                                        : match.match_percentage >= 40
                                          ? "secondary"
                                          : "outline"
                                    }
                                  >
                                    {match.match_percentage}%
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>README vs Job Description Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedCandidate.githubAnalysis.readmeComparison?.map((comparison, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-medium">{comparison.repository}</h5>
                              <Badge variant="outline">Score: {comparison.similarityScore}%</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{comparison.summary}</p>
                            <div className="text-xs text-gray-500">
                              <strong>Strengths:</strong> {comparison.keyMatches.join(", ")}
                            </div>
                          </div>
                        )) || <p className="text-gray-500 text-sm">No README analysis available</p>}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  {selectedCandidate.deepAnalysis?.insights && (
                    <Card>
                      <CardHeader>
                        <CardTitle>AI-Generated Profile Insights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h5 className="font-medium">Developer Profile</h5>
                            <div className="text-sm space-y-1">
                              <div>
                                <strong>Primary Language:</strong>{" "}
                                {selectedCandidate.deepAnalysis.insights.primary_language}
                              </div>
                              <div>
                                <strong>Activity Level:</strong>{" "}
                                {selectedCandidate.deepAnalysis.insights.activity_level}
                              </div>
                              <div>
                                <strong>Popularity Level:</strong>{" "}
                                {selectedCandidate.deepAnalysis.insights.popularity_level}
                              </div>
                              <div>
                                <strong>Skill Diversity:</strong>{" "}
                                {selectedCandidate.deepAnalysis.insights.skill_diversity} skills
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h5 className="font-medium">Top Skills Detected</h5>
                            <div className="flex flex-wrap gap-1">
                              {selectedCandidate.deepAnalysis.insights.top_skills
                                .slice(0, 10)
                                .map(([skill, count]: [string, number]) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill} ({count})
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedCandidate.readmeAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle>README Quality Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {selectedCandidate.readmeAnalysis.overall_readme_score}/100
                            </div>
                            <div className="text-sm text-green-800">Overall README Quality</div>
                          </div>

                          <div>
                            <h5 className="font-medium mb-2">AI Assessment</h5>
                            <p className="text-sm text-gray-600 mb-3">
                              {selectedCandidate.readmeAnalysis.overall_insights.assessment}
                            </p>

                            <h6 className="font-medium mb-2">Recommendations:</h6>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {selectedCandidate.readmeAnalysis.overall_insights.recommendations.map(
                                (rec: string, index: number) => (
                                  <li key={index}>• {rec}</li>
                                ),
                              )}
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-medium mb-2">Top Repository READMEs</h5>
                            <div className="space-y-2">
                              {selectedCandidate.readmeAnalysis.readme_analyses
                                .filter((analysis: any) => analysis.readme_score > 0)
                                .slice(0, 5)
                                .map((analysis: any, index: number) => (
                                  <div key={index} className="border rounded p-3">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="font-medium">{analysis.repo_name}</span>
                                      <Badge variant={analysis.readme_score >= 70 ? "default" : "secondary"}>
                                        {analysis.readme_score}/100
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600">{analysis.feedback}</p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedCandidate.activityData && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Activity & Growth Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium mb-2">Activity Breakdown</h5>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Commit Frequency:</span>
                                  <span>{selectedCandidate.activityData.breakdown.commit_frequency}/100</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Recent Activity:</span>
                                  <span>{selectedCandidate.activityData.breakdown.recent_activity}/100</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Consistency:</span>
                                  <span>{selectedCandidate.activityData.breakdown.consistency}/100</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h5 className="font-medium mb-2">Activity Details</h5>
                              <div className="space-y-1 text-sm">
                                <div>Total Repos: {selectedCandidate.activityData.details.total_repos}</div>
                                <div>Active Repos: {selectedCandidate.activityData.details.active_repos}</div>
                                <div>Recent Commits: {selectedCandidate.activityData.details.recent_commits}</div>
                                <div>
                                  Account Age: {selectedCandidate.activityData.details.account_age_months} months
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
