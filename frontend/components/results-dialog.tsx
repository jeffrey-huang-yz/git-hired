"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Github, Star, GitCommit, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import type { JobPosting, Candidate, ExtractedLink, Repository, ReadmeComparison } from "@/app/dashboard/page"
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
  Zap,
  FileText,
} from "lucide-react"

// Backend API configuration
const API_BASE_URL = "http://localhost:5001"

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

interface TechnicalProficiencyRepo {
  repo_name: string
  language: string
  stars: number
  forks: number
  technical_score: number
  code_quality_score: number
  complexity_metrics: {
    avg_complexity: number
    max_complexity: number
    files_analyzed: number
    complexity_distribution: {
      low: number
      medium: number
      high: number
    }
  }
  architecture_score: number
  best_practices_score: number
  innovation_score: number
  maintainability_score: number
  technical_debt_score: number
  security_score: number
  documentation_score: number
  testing_score: number
  technical_strengths: string[]
  improvement_areas: string[]
  technology_stack: string[]
  advanced_features: string[]
}

interface TechnicalProficiencyData {
  username: string
  overall_technical_score: number
  repository_scores: TechnicalProficiencyRepo[]
  language_proficiency: Record<
    string,
    {
      avg_score: number
      repo_count: number
      max_score: number
      consistency: number
    }
  >
  technical_insights: {
    primary_languages: string[]
    avg_complexity: number
    code_quality_trend: string
    technical_diversity: number
    top_technical_repos: Array<{
      name: string
      score: number
      language: string
    }>
    improvement_recommendations: string[]
  }
  analysis_summary: {
    total_repos_analyzed: number
    analysis_duration_seconds: number
    languages_detected: string[]
    avg_complexity: number
    avg_quality_score: number
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
    repositories: any[]
    languageProficiency: Record<string, { score: number; linesOfCode: number; repositories: number }>
    skillsMatch: string[]
    skillProficiency: Record<string, number>
    readmeComparison?: any[]
  }
  extractedLinks?: any[]
  // Backend analysis data
  deepAnalysis?: any
  readmeAnalysis?: any
  matchingResults?: any
  activityData?: any
  technicalProficiency?: TechnicalProficiencyData
  codeProficiency?: any
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

export function EnhancedResultsDialog({ job, open, onOpenChange }: ResultsDialogProps) {
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

      // 4. Code Proficiency Analysis (Use existing route)
      setAnalyzing(`Code proficiency analysis for ${candidate.name}...`)
      const codeProficiencyResponse = await fetch(`${API_BASE_URL}/code-proficiency/${username}`)
      const codeProficiency = codeProficiencyResponse.ok ? await codeProficiencyResponse.json() : null

      // 5. Technical Proficiency Analysis (NEW - Per Repository)
      setAnalyzing(`Repository technical analysis for ${candidate.name}...`)
      const technicalProficiencyResponse = await fetch(`${API_BASE_URL}/technical-proficiency/${username}`)
      const technicalProficiency = technicalProficiencyResponse.ok ? await technicalProficiencyResponse.json() : null

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

      // Calculate comprehensive scores using backend data with technical proficiency
      const technicalScore = calculateEnhancedTechnicalScore(deepAnalysis, technicalProficiency)
      const relevanceScore = matchingResults?.total_match_percentage || 0
      const codeQualityScore = calculateEnhancedCodeQualityScore(readmeAnalysis, codeProficiency)
      const activityScore = activityData?.activity_score || 0

      // Calculate overall score (weighted) - now heavily includes technical proficiency
      const overallScore = Math.round(
        technicalScore * 0.4 + relevanceScore * 0.3 + codeQualityScore * 0.2 + activityScore * 0.1,
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
        repositories: transformRepositoriesWithTechnicalData(
          deepAnalysis?.repo_details || [],
          matchingResults,
          technicalProficiency?.repository_scores || [],
        ),
        languageProficiency: transformEnhancedLanguageProficiency(
          deepAnalysis?.language_distribution,
          deepAnalysis?.commits_per_language,
          technicalProficiency?.language_proficiency,
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
        codeProficiency, // Add this line
        technicalProficiency,
      }
    } catch (error) {
      console.error(`Comprehensive analysis failed for ${username}:`, error)
      throw error
    }
  }

  // Enhanced helper functions for data transformation
  const calculateEnhancedTechnicalScore = (deepAnalysis: any, technicalProficiency: any): number => {
    if (!deepAnalysis) return 0

    const languageCount = Object.keys(deepAnalysis.language_distribution || {}).length
    const skillCount = Object.keys(deepAnalysis.skills_analysis?.all_inferred_skills || {}).length
    const avgStars = deepAnalysis.popularity_metrics?.avg_stars_per_repo || 0
    const totalCommits = deepAnalysis.activity_metrics?.total_commits || 0

    // NEW: Technical proficiency score from detailed analysis
    const technicalProficiencyScore = technicalProficiency?.overall_technical_score || 0
    const technicalDiversity = technicalProficiency?.technical_insights?.technical_diversity || 0

    // Enhanced technical scoring with repository-level technical analysis
    const languageScore = Math.min(languageCount * 6, 20)
    const skillScore = Math.min(skillCount * 1.2, 25)
    const popularityScore = Math.min(avgStars * 3, 15)
    const activityScore = Math.min(totalCommits / 80, 10)
    const proficiencyScore = Math.min(technicalProficiencyScore / 3.3, 30) // 30% weight for technical proficiency

    return Math.round(languageScore + skillScore + popularityScore + activityScore + proficiencyScore)
  }

  const calculateEnhancedCodeQualityScore = (readmeAnalysis: any, codeProficiency: any): number => {
    const readmeScore = readmeAnalysis?.overall_readme_score || 0

    // Use the existing code proficiency analysis for quality scoring
    const overallCodeScore = codeProficiency?.average_score || 0
    const proficiencyLevel = codeProficiency?.proficiency_level || "Novice"

    // Convert proficiency level to bonus points
    const levelBonus =
      {
        Expert: 20,
        Advanced: 15,
        Intermediate: 10,
        Beginner: 5,
        Novice: 0,
      }[proficiencyLevel] || 0

    // Weighted combination: 30% README, 60% code proficiency, 10% level bonus
    return Math.round(readmeScore * 0.3 + overallCodeScore * 0.6 + levelBonus * 0.1)
  }

  const transformRepositoriesWithTechnicalData = (repoDetails: any[], matchingResults: any, technicalScores: any[]) => {
    return (repoDetails || []).map((repo: any) => {
      const technicalData = technicalScores.find((tech: any) => tech.repo_name === repo.name)

      return {
        name: repo.name || "",
        description: repo.description || "",
        language: repo.language || "",
        stars: repo.stars || 0,
        commits: repo.commits || 0,
        relevanceScore:
          matchingResults?.repo_matches?.find((m: any) => m.repo_name === repo.name)?.match_percentage || 0,
        codeQualityScore: technicalData?.code_quality_score || Math.min((repo.readme_content?.length || 0) / 10, 100),
        linesOfCode: repo.linesOfCode || 0,
        fileCount: repo.fileCount || 0,
        complexityScore: technicalData?.complexity_metrics?.avg_complexity || 0,
        technologies: repo.detected_skills || [],
        codeIssues: technicalData?.improvement_areas || [],
        // NEW: Enhanced technical data
        technicalScore: technicalData?.technical_score || 0,
        architectureScore: technicalData?.architecture_score || 0,
        maintainabilityScore: technicalData?.maintainability_score || 0,
        innovationScore: technicalData?.innovation_score || 0,
        securityScore: technicalData?.security_score || 0,
        testingScore: technicalData?.testing_score || 0,
        technicalStrengths: technicalData?.technical_strengths || [],
        advancedFeatures: technicalData?.advanced_features || [],
        technologyStack: technicalData?.technology_stack || [],
      }
    })
  }

  const transformEnhancedLanguageProficiency = (langDist: any, commitsDist: any, technicalProficiency: any) => {
    const result: Record<string, { score: number; linesOfCode: number; repositories: number }> = {}

    if (langDist) {
      Object.entries(langDist).forEach(([lang, repoCount]) => {
        const commits = commitsDist?.[lang] || 0
        const technicalScore = technicalProficiency?.[lang]?.avg_score || 0
        const consistency = technicalProficiency?.[lang]?.consistency || 0

        // Enhanced scoring with technical proficiency data
        result[lang] = {
          score: Math.min(
            (repoCount as number) * 10 + (commits as number) / 20 + technicalScore * 0.5 + consistency * 20,
            100,
          ),
          linesOfCode: (commits as number) * 50, // Estimate
          repositories: repoCount as number,
        }
      })
    }

    return result
  }

  const calculateSkillsMatch = (requiredSkills: string[], detectedSkills: Record<string, number>): string[] => {
    const matches: string[] = []
    const detectedSkillsLower = Object.keys(detectedSkills).map((s) => s.toLowerCase())

    requiredSkills.forEach((skill) => {
      if (detectedSkillsLower.some((detected) => detected.includes(skill.toLowerCase()))) {
        matches.push(skill)
      }
    })

    return matches
  }

  const transformReadmeComparison = (readmeAnalyses: any[]) => {
    return (readmeAnalyses || []).map((analysis) => ({
      repoName: analysis.repo_name,
      score: analysis.readme_score,
      hasReadme: analysis.has_readme,
      feedback: analysis.feedback,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
    }))
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  const getTechnicalLevelBadge = (score: number) => {
    if (score >= 85) return { label: "Expert", variant: "default" as const }
    if (score >= 70) return { label: "Advanced", variant: "secondary" as const }
    if (score >= 55) return { label: "Intermediate", variant: "outline" as const }
    if (score >= 40) return { label: "Beginner", variant: "outline" as const }
    return { label: "Novice", variant: "destructive" as const }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Analyzing Candidates for {job.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">{analyzing || "Loading..."}</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <XCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchAndAnalyzeCandidates} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Analysis
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Results for {job.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[calc(90vh-120px)]">
          {/* Candidates List */}
          <div className="w-80 border-r pr-4">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Candidates ({candidates.length})</h3>
              <div className="text-sm text-muted-foreground">Ranked by comprehensive technical analysis</div>
            </div>
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {candidates.map((candidate) => (
                  <Card
                    key={candidate.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedCandidate?.id === candidate.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {candidate.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{candidate.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {getGitHubUsername(candidate) || extractUsernameFromUrl(candidate.githubUrl) || "No GitHub"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getScoreBadgeVariant(candidate.score)} className="text-xs">
                              {candidate.score}%
                            </Badge>
                            {candidate.technicalProficiency && (
                              <Badge
                                variant={
                                  getTechnicalLevelBadge(candidate.technicalProficiency.overall_technical_score).variant
                                }
                                className="text-xs"
                              >
                                {getTechnicalLevelBadge(candidate.technicalProficiency.overall_technical_score).label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Detailed Analysis */}
          <div className="flex-1">
            {selectedCandidate ? (
              <Tabs defaultValue="overview" className="h-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                  <TabsTrigger value="repositories">Repositories</TabsTrigger>
                  <TabsTrigger value="proficiency">Code Proficiency</TabsTrigger>
                  <TabsTrigger value="matching">Job Match</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[calc(100%-60px)] mt-4">
                  <TabsContent value="overview" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {selectedCandidate.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          {selectedCandidate.name}
                        </CardTitle>
                        <CardDescription>
                          {selectedCandidate.email} •{" "}
                          {getGitHubUsername(selectedCandidate) || extractUsernameFromUrl(selectedCandidate.githubUrl)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(selectedCandidate.score)}`}>
                              {selectedCandidate.score}%
                            </div>
                            <div className="text-sm text-muted-foreground">Overall Score</div>
                          </div>
                          <div className="text-center">
                            <div
                              className={`text-2xl font-bold ${getScoreColor(selectedCandidate.githubAnalysis.technicalScore)}`}
                            >
                              {selectedCandidate.githubAnalysis.technicalScore}%
                            </div>
                            <div className="text-sm text-muted-foreground">Technical</div>
                          </div>
                          <div className="text-center">
                            <div
                              className={`text-2xl font-bold ${getScoreColor(selectedCandidate.githubAnalysis.relevanceScore)}`}
                            >
                              {selectedCandidate.githubAnalysis.relevanceScore}%
                            </div>
                            <div className="text-sm text-muted-foreground">Job Relevance</div>
                          </div>
                          <div className="text-center">
                            <div
                              className={`text-2xl font-bold ${getScoreColor(selectedCandidate.githubAnalysis.activityScore)}`}
                            >
                              {selectedCandidate.githubAnalysis.activityScore}%
                            </div>
                            <div className="text-sm text-muted-foreground">Activity</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Enhanced Technical Proficiency Overview */}
                    {selectedCandidate.technicalProficiency && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Code className="h-5 w-5" />
                            Technical Proficiency Analysis
                          </CardTitle>
                          <CardDescription>
                            Repository-level technical analysis with{" "}
                            {selectedCandidate.technicalProficiency.analysis_summary.total_repos_analyzed} repositories
                            analyzed
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="text-center">
                              <div
                                className={`text-2xl font-bold ${getScoreColor(selectedCandidate.technicalProficiency.overall_technical_score)}`}
                              >
                                {selectedCandidate.technicalProficiency.overall_technical_score}%
                              </div>
                              <div className="text-sm text-muted-foreground">Overall Technical Score</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {selectedCandidate.technicalProficiency.technical_insights.technical_diversity}%
                              </div>
                              <div className="text-sm text-muted-foreground">Technical Diversity</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {selectedCandidate.technicalProficiency.technical_insights.avg_complexity.toFixed(1)}
                              </div>
                              <div className="text-sm text-muted-foreground">Avg Complexity</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-600">
                                {selectedCandidate.technicalProficiency.technical_insights.primary_languages.length}
                              </div>
                              <div className="text-sm text-muted-foreground">Languages</div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Primary Languages</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedCandidate.technicalProficiency.technical_insights.primary_languages.map(
                                  (lang) => (
                                    <Badge key={lang} variant="outline">
                                      {lang}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Top Technical Repositories</h4>
                              <div className="space-y-2">
                                {selectedCandidate.technicalProficiency.technical_insights.top_technical_repos
                                  .slice(0, 3)
                                  .map((repo) => (
                                    <div
                                      key={repo.name}
                                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                                    >
                                      <div>
                                        <span className="font-medium">{repo.name}</span>
                                        <span className="text-sm text-muted-foreground ml-2">({repo.language})</span>
                                      </div>
                                      <Badge variant={getScoreBadgeVariant(repo.score)}>{repo.score}%</Badge>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {selectedCandidate.technicalProficiency.technical_insights.improvement_recommendations
                              .length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Improvement Recommendations</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {selectedCandidate.technicalProficiency.technical_insights.improvement_recommendations.map(
                                    (rec, index) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                        {rec}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Language Proficiency */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Language Proficiency</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(selectedCandidate.githubAnalysis.languageProficiency)
                            .sort(([, a], [, b]) => b.score - a.score)
                            .slice(0, 5)
                            .map(([language, data]) => (
                              <div key={language} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{language}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">{data.repositories} repos</span>
                                    <Badge variant="outline">{Math.round(data.score)}%</Badge>
                                  </div>
                                </div>
                                <Progress value={data.score} className="h-2" />
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Skills Match */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Skills Match</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2 text-green-600">Matched Skills</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedCandidate.githubAnalysis.skillsMatch.map((skill) => (
                                <Badge key={skill} variant="default" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2 text-red-600">Missing Skills</h4>
                            <div className="flex flex-wrap gap-2">
                              {job.requiredSkills
                                .filter((skill) => !selectedCandidate.githubAnalysis.skillsMatch.includes(skill))
                                .map((skill) => (
                                  <Badge key={skill} variant="destructive" className="bg-red-100 text-red-800">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    {skill}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="technical" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Technical Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span>Technical Score</span>
                              <Badge variant={getScoreBadgeVariant(selectedCandidate.githubAnalysis.technicalScore)}>
                                {selectedCandidate.githubAnalysis.technicalScore}%
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Code Quality</span>
                              <Badge variant={getScoreBadgeVariant(selectedCandidate.githubAnalysis.codeQualityScore)}>
                                {selectedCandidate.githubAnalysis.codeQualityScore}%
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Total Stars</span>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span>{selectedCandidate.githubAnalysis.totalStars}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Repositories</span>
                              <span>{selectedCandidate.githubAnalysis.repositories.length}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <GitCommit className="h-5 w-5" />
                            Activity Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedCandidate.activityData && (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span>Activity Score</span>
                                <Badge variant={getScoreBadgeVariant(selectedCandidate.activityData.activity_score)}>
                                  {selectedCandidate.activityData.activity_score}%
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm">Commit Frequency</span>
                                  <span className="text-sm">
                                    {selectedCandidate.activityData.breakdown.commit_frequency}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm">Recent Activity</span>
                                  <span className="text-sm">
                                    {selectedCandidate.activityData.breakdown.recent_activity}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm">Consistency</span>
                                  <span className="text-sm">
                                    {selectedCandidate.activityData.breakdown.consistency}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* README Analysis */}
                    {selectedCandidate.readmeAnalysis && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            README Quality Analysis
                          </CardTitle>
                          <CardDescription>
                            Analysis of {selectedCandidate.readmeAnalysis.repos_with_readme} READMEs out of{" "}
                            {selectedCandidate.readmeAnalysis.total_repos} repositories
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Overall README Score</span>
                              <Badge
                                variant={getScoreBadgeVariant(selectedCandidate.readmeAnalysis.overall_readme_score)}
                              >
                                {selectedCandidate.readmeAnalysis.overall_readme_score}%
                              </Badge>
                            </div>

                            {selectedCandidate.readmeAnalysis.overall_insights && (
                              <div className="space-y-2">
                                <h4 className="font-medium">Assessment</h4>
                                <p className="text-sm text-muted-foreground">
                                  {selectedCandidate.readmeAnalysis.overall_insights.assessment}
                                </p>

                                {selectedCandidate.readmeAnalysis.overall_insights.recommendations && (
                                  <div>
                                    <h4 className="font-medium mt-3 mb-2">Recommendations</h4>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                      {selectedCandidate.readmeAnalysis.overall_insights.recommendations.map(
                                        (rec: string, index: number) => (
                                          <li key={index} className="flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                            {rec}
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="repositories" className="space-y-4">
                    <div className="grid gap-4">
                      {selectedCandidate.githubAnalysis.repositories
                        .sort((a, b) => b.stars - a.stars)
                        .slice(0, 10)
                        .map((repo) => (
                          <Card key={repo.name}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-lg">{repo.name}</CardTitle>
                                  <CardDescription className="mt-1">
                                    {repo.description || "No description available"}
                                  </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{repo.language}</Badge>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Star className="h-4 w-4" />
                                    {repo.stars}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="text-center">
                                  <div className={`text-lg font-bold ${getScoreColor(repo.relevanceScore)}`}>
                                    {repo.relevanceScore}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">Job Relevance</div>
                                </div>
                                <div className="text-center">
                                  <div className={`text-lg font-bold ${getScoreColor(repo.codeQualityScore)}`}>
                                    {repo.codeQualityScore}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">Code Quality</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-blue-600">{repo.commits}</div>
                                  <div className="text-xs text-muted-foreground">Commits</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-purple-600">{repo.complexityScore}</div>
                                  <div className="text-xs text-muted-foreground">Complexity</div>
                                </div>
                              </div>

                              {/* Enhanced Technical Metrics */}
                              {(repo.technicalScore || repo.architectureScore || repo.maintainabilityScore) && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted/50 rounded">
                                  {repo.technicalScore && (
                                    <div className="text-center">
                                      <div className={`text-sm font-bold ${getScoreColor(repo.technicalScore)}`}>
                                        {repo.technicalScore}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">Technical</div>
                                    </div>
                                  )}
                                  {repo.architectureScore && (
                                    <div className="text-center">
                                      <div className={`text-sm font-bold ${getScoreColor(repo.architectureScore)}`}>
                                        {repo.architectureScore}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">Architecture</div>
                                    </div>
                                  )}
                                  {repo.maintainabilityScore && (
                                    <div className="text-center">
                                      <div className={`text-sm font-bold ${getScoreColor(repo.maintainabilityScore)}`}>
                                        {repo.maintainabilityScore}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">Maintainability</div>
                                    </div>
                                  )}
                                  {repo.innovationScore && (
                                    <div className="text-center">
                                      <div className={`text-sm font-bold ${getScoreColor(repo.innovationScore)}`}>
                                        {repo.innovationScore}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">Innovation</div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {repo.technologies && repo.technologies.length > 0 && (
                                <div className="mb-3">
                                  <h4 className="text-sm font-medium mb-2">Technologies</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {repo.technologies.slice(0, 8).map((tech: string) => (
                                      <Badge key={tech} variant="outline" className="text-xs">
                                        {tech}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {repo.technicalStrengths && repo.technicalStrengths.length > 0 && (
                                <div className="mb-3">
                                  <h4 className="text-sm font-medium mb-2 text-green-600">Technical Strengths</h4>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    {repo.technicalStrengths.slice(0, 3).map((strength: string, index: number) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                        {strength}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {repo.codeIssues && repo.codeIssues.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2 text-yellow-600">Areas for Improvement</h4>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    {repo.codeIssues.slice(0, 3).map((issue: string, index: number) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                        {issue}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="proficiency" className="space-y-6">
                    {selectedCandidate.technicalProficiency ? (
                      <>
                        {/* Language Proficiency Breakdown */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Code className="h-5 w-5" />
                              Language Proficiency Breakdown
                            </CardTitle>
                            <CardDescription>Technical proficiency analysis per programming language</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {Object.entries(selectedCandidate.technicalProficiency.language_proficiency)
                                .sort(([, a], [, b]) => b.avg_score - a.avg_score)
                                .map(([language, data]) => (
                                  <div key={language} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium">{language}</span>
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">
                                          {data.repo_count} repos • Max: {data.max_score}% • Consistency:{" "}
                                          {Math.round(data.consistency * 100)}%
                                        </span>
                                        <Badge variant={getScoreBadgeVariant(data.avg_score)}>{data.avg_score}%</Badge>
                                      </div>
                                    </div>
                                    <Progress value={data.avg_score} className="h-2" />
                                  </div>
                                ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Repository Technical Scores */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Zap className="h-5 w-5" />
                              Repository Technical Analysis
                            </CardTitle>
                            <CardDescription>Detailed technical scoring for each repository</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {selectedCandidate.technicalProficiency.repository_scores
                                .sort((a, b) => b.technical_score - a.technical_score)
                                .slice(0, 10)
                                .map((repo) => (
                                  <div key={repo.repo_name} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h4 className="font-medium">{repo.repo_name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge variant="outline">{repo.language}</Badge>
                                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Star className="h-3 w-3" />
                                            {repo.stars}
                                          </div>
                                        </div>
                                      </div>
                                      <Badge
                                        variant={getScoreBadgeVariant(repo.technical_score)}
                                        className="text-lg px-3 py-1"
                                      >
                                        {repo.technical_score}%
                                      </Badge>
                                    </div>

                                    {/* Technical Metrics Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                      <div className="text-center p-2 bg-muted/50 rounded">
                                        <div className={`font-bold ${getScoreColor(repo.code_quality_score)}`}>
                                          {repo.code_quality_score}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Code Quality</div>
                                      </div>
                                      <div className="text-center p-2 bg-muted/50 rounded">
                                        <div className={`font-bold ${getScoreColor(repo.architecture_score)}`}>
                                          {repo.architecture_score}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Architecture</div>
                                      </div>
                                      <div className="text-center p-2 bg-muted/50 rounded">
                                        <div className={`font-bold ${getScoreColor(repo.maintainability_score)}`}>
                                          {repo.maintainability_score}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Maintainability</div>
                                      </div>
                                      <div className="text-center p-2 bg-muted/50 rounded">
                                        <div className={`font-bold ${getScoreColor(repo.innovation_score)}`}>
                                          {repo.innovation_score}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Innovation</div>
                                      </div>
                                    </div>

                                    {/* Additional Metrics */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                      <div className="text-center p-2 bg-blue-50 rounded">
                                        <div className="font-bold text-blue-600">
                                          {repo.complexity_metrics.avg_complexity.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Avg Complexity</div>
                                      </div>
                                      <div className="text-center p-2 bg-green-50 rounded">
                                        <div className={`font-bold ${getScoreColor(repo.testing_score)}`}>
                                          {repo.testing_score}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Testing</div>
                                      </div>
                                      <div className="text-center p-2 bg-purple-50 rounded">
                                        <div className={`font-bold ${getScoreColor(repo.security_score)}`}>
                                          {repo.security_score}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Security</div>
                                      </div>
                                      <div className="text-center p-2 bg-orange-50 rounded">
                                        <div className={`font-bold ${getScoreColor(repo.documentation_score)}`}>
                                          {repo.documentation_score}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Documentation</div>
                                      </div>
                                    </div>

                                    {/* Technology Stack */}
                                    {repo.technology_stack.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-medium mb-2">Technology Stack</h5>
                                        <div className="flex flex-wrap gap-1">
                                          {repo.technology_stack.map((tech) => (
                                            <Badge key={tech} variant="outline" className="text-xs">
                                              {tech}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Advanced Features */}
                                    {repo.advanced_features.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-medium mb-2 text-purple-600">Advanced Features</h5>
                                        <div className="flex flex-wrap gap-1">
                                          {repo.advanced_features.map((feature) => (
                                            <Badge
                                              key={feature}
                                              variant="secondary"
                                              className="text-xs bg-purple-100 text-purple-800"
                                            >
                                              <Zap className="h-3 w-3 mr-1" />
                                              {feature}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Technical Strengths */}
                                    {repo.technical_strengths.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-medium mb-2 text-green-600">Technical Strengths</h5>
                                        <ul className="text-xs text-muted-foreground space-y-1">
                                          {repo.technical_strengths.slice(0, 3).map((strength, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                              {strength}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Improvement Areas */}
                                    {repo.improvement_areas.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-medium mb-2 text-yellow-600">Improvement Areas</h5>
                                        <ul className="text-xs text-muted-foreground space-y-1">
                                          {repo.improvement_areas.slice(0, 3).map((area, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                              <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                              {area}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <Card>
                        <CardContent className="text-center py-12">
                          <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Technical Proficiency Data</h3>
                          <p className="text-muted-foreground">
                            Technical proficiency analysis is not available for this candidate.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="matching" className="space-y-6">
                    {selectedCandidate.matchingResults ? (
                      <>
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5" />
                              AI-Powered Job Matching Analysis
                            </CardTitle>
                            <CardDescription>Comprehensive matching analysis using AI evaluation</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center mb-6">
                              <div
                                className={`text-4xl font-bold ${getScoreColor(selectedCandidate.matchingResults.total_match_percentage)}`}
                              >
                                {selectedCandidate.matchingResults.total_match_percentage}%
                              </div>
                              <div className="text-muted-foreground">Overall Job Match</div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-medium">Repository Match Analysis</h4>
                              {selectedCandidate.matchingResults.repo_matches
                                .sort((a: any, b: any) => b.match_percentage - a.match_percentage)
                                .slice(0, 8)
                                .map((repoMatch: any) => (
                                  <div
                                    key={repoMatch.repo_name}
                                    className="flex items-center justify-between p-3 bg-muted/50 rounded"
                                  >
                                    <span className="font-medium">{repoMatch.repo_name}</span>
                                    <Badge variant={getScoreBadgeVariant(repoMatch.match_percentage)}>
                                      {repoMatch.match_percentage}%
                                    </Badge>
                                  </div>
                                ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Job Requirements Analysis</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Required Skills</h4>
                                <div className="grid grid-cols-1 gap-2">
                                  {job.requiredSkills.map((skill) => {
                                    const isMatched = selectedCandidate.githubAnalysis.skillsMatch.includes(skill)
                                    return (
                                      <div
                                        key={skill}
                                        className="flex items-center justify-between p-2 bg-muted/50 rounded"
                                      >
                                        <span>{skill}</span>
                                        {isMatched ? (
                                          <Badge variant="default" className="bg-green-100 text-green-800">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Matched
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive" className="bg-red-100 text-red-800">
                                            <XCircle className="h-3 w-3 mr-1" />
                                            Missing
                                          </Badge>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {job.niceToHave && job.niceToHave.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Nice to Have Skills</h4>
                                  <div className="grid grid-cols-1 gap-2">
                                    {job.niceToHave.map((skill) => {
                                      const isMatched = selectedCandidate.githubAnalysis.skillsMatch.includes(skill)
                                      return (
                                        <div
                                          key={skill}
                                          className="flex items-center justify-between p-2 bg-muted/50 rounded"
                                        >
                                          <span>{skill}</span>
                                          {isMatched ? (
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Bonus
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline">Not Found</Badge>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <Card>
                        <CardContent className="text-center py-12">
                          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Matching Data Available</h3>
                          <p className="text-muted-foreground">
                            Job matching analysis could not be performed for this candidate.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="activity" className="space-y-6">
                    {selectedCandidate.activityData ? (
                      <>
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5" />
                              Activity & Growth Analysis
                            </CardTitle>
                            <CardDescription>
                              Comprehensive analysis of GitHub activity patterns and growth trends
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center mb-6">
                              <div
                                className={`text-4xl font-bold ${getScoreColor(selectedCandidate.activityData.activity_score)}`}
                              >
                                {selectedCandidate.activityData.activity_score}%
                              </div>
                              <div className="text-muted-foreground">Overall Activity Score</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <h4 className="font-medium">Activity Breakdown</h4>
                                {Object.entries(selectedCandidate.activityData.breakdown).map(([metric, score]) => (
                                  <div key={metric} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="capitalize">{metric.replace("_", " ")}</span>
                                      <Badge variant={getScoreBadgeVariant(score as number)}>{score}%</Badge>
                                    </div>
                                    <Progress value={score as number} className="h-2" />
                                  </div>
                                ))}
                              </div>

                              <div className="space-y-4">
                                <h4 className="font-medium">Activity Details</h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Total Repositories</span>
                                    <span className="font-medium">
                                      {selectedCandidate.activityData.details.total_repos}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Active Repositories</span>
                                    <span className="font-medium">
                                      {selectedCandidate.activityData.details.active_repos}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Recent Commits</span>
                                    <span className="font-medium">
                                      {selectedCandidate.activityData.details.recent_commits}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Account Age</span>
                                    <span className="font-medium">
                                      {selectedCandidate.activityData.details.account_age_months} months
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Deep Analysis Data */}
                        {selectedCandidate.deepAnalysis && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <GitCommit className="h-5 w-5" />
                                Contribution Patterns
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {selectedCandidate.deepAnalysis.activity_metrics?.total_commits || 0}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Total Commits</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">
                                    {selectedCandidate.deepAnalysis.activity_metrics?.active_repos_count || 0}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Active Repos</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-purple-600">
                                    {selectedCandidate.deepAnalysis.activity_metrics?.avg_commits_per_repo || 0}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Avg Commits/Repo</div>
                                </div>
                              </div>

                              {selectedCandidate.deepAnalysis.insights && (
                                <div className="mt-6 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-2">Activity Level</h4>
                                      <Badge
                                        variant={
                                          selectedCandidate.deepAnalysis.insights.activity_level === "High"
                                            ? "default"
                                            : selectedCandidate.deepAnalysis.insights.activity_level === "Medium"
                                              ? "secondary"
                                              : "outline"
                                        }
                                      >
                                        {selectedCandidate.deepAnalysis.insights.activity_level}
                                      </Badge>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Contribution Consistency</h4>
                                      <Badge
                                        variant={
                                          selectedCandidate.deepAnalysis.insights.contribution_consistency === "High"
                                            ? "default"
                                            : selectedCandidate.deepAnalysis.insights.contribution_consistency ===
                                                "Medium"
                                              ? "secondary"
                                              : "outline"
                                        }
                                      >
                                        {selectedCandidate.deepAnalysis.insights.contribution_consistency}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : (
                      <Card>
                        <CardContent className="text-center py-12">
                          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Activity Data Available</h3>
                          <p className="text-muted-foreground">
                            Activity analysis could not be performed for this candidate.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Github className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Candidate</h3>
                  <p className="text-muted-foreground">Choose a candidate from the list to view detailed analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
