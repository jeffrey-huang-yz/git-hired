"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Github, Zap, Target, Brain } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const router = useRouter()
  const [squares, setSquares] = useState<Array<{ id: number; intensity: number; animating: boolean }>>([])

  // Initialize the commit chart squares
  useEffect(() => {
    const initialSquares = Array.from({ length: 350 }, (_, i) => ({
      id: i,
      intensity: Math.floor(Math.random() * 5),
      animating: false,
    }))
    setSquares(initialSquares)

    // Animate squares randomly
    const interval = setInterval(() => {
      setSquares((prev) =>
        prev.map((square) => {
          if (Math.random() < 0.05) {
            // 5% chance to animate each square
            return {
              ...square,
              intensity: Math.floor(Math.random() * 5),
              animating: true,
            }
          }
          return { ...square, animating: false }
        }),
      )
    }, 200)

    return () => clearInterval(interval)
  }, [])

  const getSquareColor = (intensity: number) => {
    const colors = [
      "bg-gray-100", // 0 - no contributions
      "bg-green-200", // 1 - low
      "bg-green-300", // 2 - medium-low
      "bg-green-500", // 3 - medium-high
      "bg-green-700", // 4 - high
    ]
    return colors[intensity] || colors[0]
  }

  const features = [
    {
      icon: <Brain className="w-8 h-8 text-blue-600" />,
      title: "AI-Powered Analysis",
      description:
        "Leverage Google Gemini AI to analyze GitHub profiles and match candidates to job requirements with precision.",
      gradient: "from-blue-500 to-purple-600",
    },
    {
      icon: <Github className="w-8 h-8 text-gray-800" />,
      title: "GitHub Integration",
      description:
        "Deep dive into repositories, code quality, commit history, and technical proficiency across multiple languages.",
      gradient: "from-gray-700 to-gray-900",
    },
    {
      icon: <Target className="w-8 h-8 text-green-600" />,
      title: "Smart Matching",
      description:
        "Advanced algorithms compare candidate skills, project relevance, and experience against job requirements.",
      gradient: "from-green-500 to-emerald-600",
    },
  ]

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section with Animated Background */}
      <div className="relative">
        {/* Animated Commit Chart Background */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-25 gap-1 opacity-30 transform scale-150">
            <div className="grid grid-cols-[repeat(25,minmax(0,1fr))] gap-1">
                {squares.map((square) => (
                    <div
                        key={square.id}
                        className={`w-3 h-3 rounded-sm transition-all duration-500 ${getSquareColor(square.intensity)} ${
                            square.animating ? "scale-110 shadow-lg" : ""
                        }`}
                        style={{
                            animationDelay: `${Math.random() * 2}s`,
                        }}
                    />
                ))}
            </div>
          </div>
        </div>
        {/* Hero Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
            <div className="text-center space-y-8 max-w-4xl mx-auto">
                {/* Logo Animation */}
                <div className="animate-fade-in-up -mt-24">
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="relative">
                            <Github className="w-16 h-16 text-gray-800 animate-pulse" />
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full animate-ping" />
                        </div>
              </div>
            </div>

            {/* Main Title */}
            <div className="animate-fade-in-up animation-delay-200">
              <h1 className="text-8xl md:text-9xl font-black tracking-tight">
                <span className="text-gray-900">Git</span>
                <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                  Hire
                </span>
              </h1>
              <div className="mt-4 h-1 w-32 bg-gradient-to-r from-green-500 to-emerald-600 mx-auto rounded-full animate-pulse" />
            </div>

            {/* Subtitle */}
            <div className="animate-fade-in-up animation-delay-400">
              <p className="text-xl md:text-2xl text-gray-800 font-semibold max-w-3xl mx-auto leading-relaxed">
                AI-powered recruitment platform that analyzes GitHub profiles to find the perfect developer match for
                your team
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="animate-fade-in-up animation-delay-600 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                onClick={() => router.push("/dashboard")}
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-gray-300 hover:border-gray-400 px-8 py-4 text-lg font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Watch Demo
                <Zap className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Choose <span className="text-green-600">GitHired</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform combines cutting-edge AI with deep GitHub analysis to revolutionize technical recruitment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg bg-white/80 backdrop-blur-sm"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <CardHeader className="pb-4">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <div className="text-white">{feature.icon}</div>
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white text-black border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Github className="w-8 h-8" />
              <span className="text-2xl font-bold">GitHired</span>
            </div>
            <div className="flex gap-6 text-gray-600">
              <a href="#" className="hover:text-black transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-black transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-black transition-colors">
                Support
              </a>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; 2024 GitHired. All rights reserved. Built with ❤️ for developers.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
