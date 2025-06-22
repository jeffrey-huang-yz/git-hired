import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import type { ParsedResume } from "./resume-parser"
import type { JobPosting, GitHubAnalysis, Repository } from "@/app/dashboard/page"

export interface AnalysisResult {
  overallScore: number
  reasoning: string
  githubAnalysis: GitHubAnalysis
}

export async function analyzeWithGemini(resume: ParsedResume, job: JobPosting): Promise<AnalysisResult> {
  try {
    // First, fetch GitHub data
    const githubData = await fetchGitHubData(resume.github_username)

    if (!githubData) {
      return {
        overallScore: 0,
        reasoning: "GitHub data not found",
        githubAnalysis: {
          repositories: [],
          languages: {},
          totalCommits: 0,
          totalStars: 0,
          profileScore: 0,
          relevanceScore: 0,
          skillsMatch: [],
        },
      }
    }

    // Analyze with Gemini
    const analysis = await analyzeCandidate(resume, job, githubData)

    return analysis
  } catch (error) {
    console.error("Error in Gemini analysis:", error)
    // Return mock data for demo
    return generateMockAnalysis(resume, job)
  }
}

async function fetchGitHubData(username: string) {
  if (!username) {
    return null
  }

  try {
    // In a real implementation, you'd use the GitHub API
    // For this demo, we'll simulate the API call and data
    console.log(`Simulating GitHub API call for user: ${username}`)
    return {
      user: {
        login: username,
        name: "Demo User",
        public_repos: 25,
        followers: 150,
        following: 75,
      },
      repos: [
        {
          name: "react-dashboard",
          description: "A modern React dashboard with TypeScript and Tailwind CSS",
          language: "TypeScript",
          stargazers_count: 45,
          forks_count: 12,
          size: 2048,
          updated_at: "2023-12-01T10:00:00Z",
        },
        {
          name: "node-api-server",
          description: "RESTful API server built with Node.js and Express",
          language: "JavaScript",
          stargazers_count: 23,
          forks_count: 8,
          size: 1024,
          updated_at: "2023-11-15T14:30:00Z",
        },
        {
          name: "python-ml-project",
          description: "Machine learning project using Python and scikit-learn",
          language: "Python",
          stargazers_count: 67,
          forks_count: 15,
          size: 3072,
          updated_at: "2023-10-20T09:15:00Z",
        },
      ],
    }
  } catch (error) {
    console.error("Error fetching GitHub data:", error)
    return null
  }
}

async function analyzeCandidate(resume: ParsedResume, job: JobPosting, githubData: any): Promise<AnalysisResult> {
  const prompt = `
    Analyze this candidate for the job position and provide a detailed assessment.
    
    JOB POSTING:
    Title: ${job.name}
    Description: ${job.description}
    Required Skills: ${job.requiredSkills.join(", ")}
    
    CANDIDATE RESUME:
    ${resume.text}
    
    GITHUB DATA:
    Username: ${githubData.user.login}
    Public Repos: ${githubData.user.public_repos}
    Repositories: ${JSON.stringify(githubData.repos, null, 2)}
    
    Please provide a comprehensive analysis including:
    1. Overall score (0-100)
    2. Technical proficiency assessment
    3. Job relevance score
    4. Skills match analysis
    5. Repository quality evaluation
    6. Detailed reasoning for the scores
    
    Focus on:
    - How well the candidate's GitHub projects align with the job requirements
    - Code quality indicators (documentation, project structure, etc.)
    - Relevant technology stack experience
    - Project complexity and scope
    - Recent activity and learning trajectory
    
    Provide the response in JSON format with the following structure:
    {
      "overallScore": number,
      "profileScore": number,
      "relevanceScore": number,
      "skillsMatch": string[],
      "reasoning": string,
      "repositories": [
        {
          "name": string,
          "relevanceScore": number,
          "analysis": string
        }
      ]
    }
  `

  try {
    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: prompt,
      maxTokens: 2000,
    })

    const analysisData = JSON.parse(text)

    // Process the analysis into our format
    const repositories: Repository[] = githubData.repos.map((repo: any, index: number) => ({
      name: repo.name,
      description: repo.description || "",
      language: repo.language || "Unknown",
      stars: repo.stargazers_count || 0,
      commits: Math.floor(Math.random() * 100) + 10, // Mock commit count
      readme: `Mock README for ${repo.name}`, // In real implementation, fetch actual README
      relevanceScore: analysisData.repositories[index]?.relevanceScore || Math.floor(Math.random() * 40) + 60,
    }))

    // Calculate language distribution
    const languages: { [key: string]: number } = {}
    repositories.forEach((repo) => {
      if (repo.language && repo.language !== "Unknown") {
        languages[repo.language] = (languages[repo.language] || 0) + 1
      }
    })

    // Convert to percentages
    const totalRepos = Object.values(languages).reduce((sum, count) => sum + count, 0)
    Object.keys(languages).forEach((lang) => {
      languages[lang] = Math.round((languages[lang] / totalRepos) * 100)
    })

    const githubAnalysis: GitHubAnalysis = {
      repositories,
      languages,
      totalCommits: repositories.reduce((sum, repo) => sum + repo.commits, 0),
      totalStars: repositories.reduce((sum, repo) => sum + repo.stars, 0),
      profileScore: analysisData.profileScore || 75,
      relevanceScore: analysisData.relevanceScore || 70,
      skillsMatch: analysisData.skillsMatch || [],
    }

    return {
      overallScore: analysisData.overallScore || 75,
      reasoning: analysisData.reasoning || "Analysis completed successfully",
      githubAnalysis,
    }
  } catch (error) {
    console.error("Error parsing Gemini response:", error)
    return generateMockAnalysis(resume, job)
  }
}

function generateMockAnalysis(resume: ParsedResume, job: JobPosting): AnalysisResult {
  // Generate realistic mock data for demo purposes
  const mockRepos: Repository[] = [
    {
      name: "react-dashboard",
      description: "Modern React dashboard with TypeScript",
      language: "TypeScript",
      stars: 45,
      commits: 127,
      readme: "Comprehensive dashboard built with React, TypeScript, and Tailwind CSS",
      relevanceScore: 85,
    },
    {
      name: "api-server",
      description: "RESTful API server with Node.js",
      language: "JavaScript",
      stars: 23,
      commits: 89,
      readme: "Scalable API server with authentication and database integration",
      relevanceScore: 78,
    },
    {
      name: "ml-project",
      description: "Machine learning project with Python",
      language: "Python",
      stars: 67,
      commits: 156,
      readme: "Data analysis and machine learning pipeline",
      relevanceScore: 45,
    },
  ]

  const skillsMatch = job.requiredSkills.filter(() => Math.random() > 0.3)
  const overallScore = Math.floor(Math.random() * 30) + 65 // 65-95 range

  return {
    overallScore,
    reasoning: `Candidate shows strong technical skills with ${skillsMatch.length} matching required skills. GitHub profile demonstrates consistent activity and relevant project experience.`,
    githubAnalysis: {
      repositories: mockRepos,
      languages: {
        TypeScript: 35,
        JavaScript: 30,
        Python: 25,
        CSS: 10,
      },
      totalCommits: mockRepos.reduce((sum, repo) => sum + repo.commits, 0),
      totalStars: mockRepos.reduce((sum, repo) => sum + repo.stars, 0),
      profileScore: Math.floor(Math.random() * 20) + 70,
      relevanceScore: Math.floor(Math.random() * 25) + 65,
      skillsMatch,
    },
  }
}
