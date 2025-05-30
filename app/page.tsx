"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  BarChart3,
  TrendingUp,
  Users,
  Star,
  AlertTriangle,
  Clock,
  ChefHat,
  Music,
  MessageSquare,
  Target,
  Calendar,
  Phone,
  Mail,
  RefreshCw,
  FileSpreadsheet,
  Activity,
  Award,
  BookOpen,
  Brain,
} from "lucide-react"

// Import xlsx library for Excel parsing
import * as XLSX from "xlsx"

interface ReviewData {
  customer_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  summary: string
  food_quality: string
  service: string
  atmosphere: string
  music_and_entertainment: string
  sentiment_score: number
  timestamp: string
  improvement_suggestions: string
  specific_points: string
  restaurant_id: string
  review_id: string
  id: string
}

export default function RestaurantDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("30")
  const [activeTab, setActiveTab] = useState("overview")
  const [data, setData] = useState<ReviewData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [calculatedMetrics, setCalculatedMetrics] = useState({
    totalReviews: 0,
    averageRating: 0,
    positiveRate: 0,
    criticalIssues: 0,
    uniqueCustomers: 0,
    recentReviews: 0,
  })
  const [apiKey, setApiKey] = useState("")
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Ensure component is mounted before rendering dynamic content
  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate metrics only on client side to prevent hydration mismatch
  useEffect(() => {
    if (mounted && data.length > 0) {
      const totalReviews = data.length
      const averageRating = data.reduce((sum, review) => sum + review.sentiment_score, 0) / totalReviews
      const positiveReviews = data.filter((review) => review.sentiment_score >= 4).length
      const positiveRate = (positiveReviews / totalReviews) * 100
      const criticalIssues = data.filter((review) => review.sentiment_score <= 2).length
      const uniqueCustomers = new Set(data.map((review) => review.customer_id)).size

      // Calculate recent reviews (last 7 days) only on client
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentReviews = data.filter((review) => new Date(review.timestamp) >= sevenDaysAgo).length

      setCalculatedMetrics({
        totalReviews,
        averageRating,
        positiveRate,
        criticalIssues,
        uniqueCustomers,
        recentReviews,
      })
    }
  }, [mounted, data])

  // Load data from Excel file directly
  useEffect(() => {
    const loadExcelData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Specify the path to your Excel file
        // Change this to match your Excel file name
        const filePath = "/Complete reviews.xlsx"

        // Fetch the Excel file
        const response = await fetch(filePath)
        if (!response.ok) {
          throw new Error(`Failed to load Excel file: ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const data = new Uint8Array(arrayBuffer)

        // Parse Excel data
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        // Process the data
        const processedData = jsonData.map((row: any, index: number) => ({
          ...row,
          // Ensure we have an ID
          id: row.id || `review_${index}`,
          // Ensure timestamp is properly formatted
          timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
          // Ensure sentiment_score is a number
          sentiment_score: typeof row.sentiment_score === "number" ? row.sentiment_score : 3,
          // Ensure other fields exist
          customer_id: row.customer_id || `customer_${index}`,
          customer_name: row.customer_name || "Anonymous",
          customer_email: row.customer_email || "",
          customer_phone: row.customer_phone || "",
          summary: row.summary || "",
          food_quality: row.food_quality || "",
          service: row.service || "",
          atmosphere: row.atmosphere || "",
          music_and_entertainment: row.music_and_entertainment || "",
          improvement_suggestions: row.improvement_suggestions || "",
          specific_points: row.specific_points || "",
          restaurant_id: row.restaurant_id || "restaurant_1",
          review_id: row.review_id || `review_${index}`,
        }))

        setData(processedData as ReviewData[])
        console.log("Data loaded successfully:", processedData.length, "records")
      } catch (err) {
        console.error("Error loading Excel file:", err)
        setError(`Failed to load data: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    if (mounted) {
      loadExcelData()
    }
  }, [mounted])

  // AI Analysis function
  const generateAiAnalysis = async () => {
    if (!apiKey.trim()) {
      alert("Please enter your OpenAI API key")
      return
    }

    setAiLoading(true)
    try {
      const filteredData = getFilteredData()
      const summaryData = {
        totalReviews: filteredData.length,
        averageRating: filteredData.reduce((sum, review) => sum + review.sentiment_score, 0) / filteredData.length,
        positiveReviews: filteredData.filter(r => r.sentiment_score >= 4).length,
        negativeReviews: filteredData.filter(r => r.sentiment_score <= 2).length,
        commonComplaints: filteredData.filter(r => r.sentiment_score <= 2).map(r => r.summary).slice(0, 5),
        improvementSuggestions: filteredData.filter(r => r.improvement_suggestions?.trim()).map(r => r.improvement_suggestions).slice(0, 5),
        foodFeedback: filteredData.filter(r => r.food_quality?.trim()).map(r => r.food_quality).slice(0, 3),
        serviceFeedback: filteredData.filter(r => r.service?.trim()).map(r => r.service).slice(0, 3),
      }

      const prompt = `As a restaurant analytics expert, analyze this customer feedback data and provide actionable insights:

Total Reviews: ${summaryData.totalReviews}
Average Rating: ${summaryData.averageRating.toFixed(1)}/5
Positive Reviews: ${summaryData.positiveReviews}
Negative Reviews: ${summaryData.negativeReviews}

Recent Complaints:
${summaryData.commonComplaints.join('\n')}

Improvement Suggestions from Customers:
${summaryData.improvementSuggestions.join('\n')}

Food Quality Feedback:
${summaryData.foodFeedback.join('\n')}

Service Feedback:
${summaryData.serviceFeedback.join('\n')}

Please provide:
1. Key strengths to maintain
2. Top 3 areas for improvement
3. Specific actionable recommendations
4. Priority level for each recommendation (High/Medium/Low)

Keep the analysis concise but actionable.`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const result = await response.json()
      setAiAnalysis(result.choices[0].message.content)
    } catch (error) {
      console.error('AI Analysis error:', error)
      alert(`Error generating AI analysis: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setAiLoading(false)
    }
  }

  // Filter data by time period - only on client side
  const getFilteredData = () => {
    if (!mounted || selectedPeriod === "all") return data

    const days = Number.parseInt(selectedPeriod)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    return data.filter((review) => new Date(review.timestamp) >= cutoffDate)
  }

  // Get sentiment distribution - safe for SSR
  const getSentimentDistribution = () => {
    if (!mounted) return [1, 2, 3, 4, 5].map(rating => ({ rating, count: 0 }))
    
    const filteredData = getFilteredData()
    const distribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: filteredData.filter((review) => Math.round(review.sentiment_score) === rating).length,
    }))
    return distribution
  }

  // Get critical reviews - safe for SSR
  const getCriticalReviews = () => {
    if (!mounted) return []
    
    const filteredData = getFilteredData()
    return filteredData
      .filter((review) => review.sentiment_score <= 2)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  }

  // Calculate category scores - safe for SSR
  const getCategoryScores = () => {
    if (!mounted) return { food: 0, service: 0, atmosphere: 0, entertainment: 0 }
    
    const filteredData = getFilteredData()
    if (filteredData.length === 0) {
      return { food: 0, service: 0, atmosphere: 0, entertainment: 0 }
    }

    const avgSentiment = filteredData.reduce((sum, review) => sum + review.sentiment_score, 0) / filteredData.length
    const foodReviews = filteredData.filter((r) => r.food_quality?.trim())
    const serviceReviews = filteredData.filter((r) => r.service?.trim())
    const atmosphereReviews = filteredData.filter((r) => r.atmosphere?.trim())
    const entertainmentReviews = filteredData.filter((r) => r.music_and_entertainment?.trim())

    return {
      food: foodReviews.length > 0 ? avgSentiment : avgSentiment * 0.9,
      service: serviceReviews.length > 0 ? avgSentiment : avgSentiment * 0.95,
      atmosphere: atmosphereReviews.length > 0 ? avgSentiment : avgSentiment * 0.85,
      entertainment: entertainmentReviews.length > 0 ? avgSentiment : avgSentiment * 0.8,
    }
  }

  // Get performance trends - safe for SSR
  const getPerformanceTrends = () => {
    if (!mounted) return []
    
    const filteredData = getFilteredData()
    const groupedByMonth = filteredData.reduce((acc, review) => {
      const month = new Date(review.timestamp).toISOString().substring(0, 7)
      if (!acc[month]) {
        acc[month] = []
      }
      acc[month].push(review)
      return acc
    }, {} as Record<string, ReviewData[]>)

    return Object.entries(groupedByMonth)
      .map(([month, reviews]) => ({
        month,
        averageRating: reviews.reduce((sum, r) => sum + r.sentiment_score, 0) / reviews.length,
        totalReviews: reviews.length,
        positiveRate: (reviews.filter(r => r.sentiment_score >= 4).length / reviews.length) * 100
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6) // Last 6 months
  }

  // Get top customers - safe for SSR
  const getTopCustomers = () => {
    if (!mounted) return []
    
    const filteredData = getFilteredData()
    const customerGroups = filteredData.reduce((acc, review) => {
      if (!acc[review.customer_id]) {
        acc[review.customer_id] = {
          customer_id: review.customer_id,
          customer_name: review.customer_name,
          customer_email: review.customer_email,
          reviews: [],
          totalReviews: 0,
          averageRating: 0,
          lastVisit: review.timestamp
        }
      }
      acc[review.customer_id].reviews.push(review)
      acc[review.customer_id].totalReviews++
      acc[review.customer_id].lastVisit = new Date(review.timestamp) > new Date(acc[review.customer_id].lastVisit) 
        ? review.timestamp : acc[review.customer_id].lastVisit
      return acc
    }, {} as Record<string, any>)

    return Object.values(customerGroups)
      .map((customer: any) => ({
        ...customer,
        averageRating: customer.reviews.reduce((sum: number, r: ReviewData) => sum + r.sentiment_score, 0) / customer.totalReviews
      }))
      .sort((a, b) => b.totalReviews - a.totalReviews)
      .slice(0, 10)
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-6 py-8">
          <Card className="mb-8">
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-lg font-medium">Loading dashboard...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Use calculated metrics for display
  const metrics = calculatedMetrics
  const sentimentDistribution = getSentimentDistribution()
  const criticalReviews = getCriticalReviews()
  const categoryScores = getCategoryScores()
  const performanceTrends = getPerformanceTrends()
  const topCustomers = getTopCustomers()

  const MetricCard = ({ title, value, change, icon: Icon, trend = "neutral" }: any) => (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p
            className={`text-xs ${trend === "positive" ? "text-green-600" : trend === "negative" ? "text-red-600" : "text-muted-foreground"}`}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  )

  const RatingStars = ({ rating }: { rating: number }) => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      ))}
      <span className="ml-2 text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  )

  // Handle refresh button click
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ChefHat className="h-8 w-8 text-orange-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Restaurant Analytics</h1>
                  <p className="text-sm text-muted-foreground">Real-time customer feedback insights</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Loading state */}
        {loading && (
          <Card className="mb-8">
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-lg font-medium">Loading your review data...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Make sure "Complete reviews.xlsx" is in your public folder
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <br />
              <span className="text-sm mt-2 block">
                Make sure your Excel file is named "Complete reviews.xlsx" and placed in the public folder.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Dashboard Content */}
        {!loading && !error && data.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-7 lg:w-fit">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Performance</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="customers" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Customers</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Trends</span>
              </TabsTrigger>
              <TabsTrigger value="ai-analysis" className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">AI Analysis</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Insights</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <MetricCard title="Average Rating" value={`${calculatedMetrics.averageRating.toFixed(1)}/5`} icon={Star} />
                <MetricCard
                  title="Total Reviews"
                  value={calculatedMetrics.totalReviews}
                  change={`+${calculatedMetrics.recentReviews} this week`}
                  icon={MessageSquare}
                />
                <MetricCard title="Satisfaction Rate" value={`${calculatedMetrics.positiveRate.toFixed(1)}%`} icon={TrendingUp} />
                <MetricCard title="Critical Issues" value={calculatedMetrics.criticalIssues} icon={AlertTriangle} />
                <MetricCard title="Unique Customers" value={calculatedMetrics.uniqueCustomers} icon={Users} />
              </div>

              {/* Charts Row */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Rating Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span>Rating Distribution</span>
                    </CardTitle>
                    <CardDescription>Customer satisfaction breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sentimentDistribution.map((item) => (
                      <div key={item.rating} className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1 w-16">
                          <span className="text-sm font-medium">{item.rating}</span>
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <Progress
                            value={mounted && calculatedMetrics.totalReviews > 0 ? (item.count / calculatedMetrics.totalReviews) * 100 : 0}
                            className="h-2"
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12">{item.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Category Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      <span>Category Performance</span>
                    </CardTitle>
                    <CardDescription>Performance across key areas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ChefHat className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium">Food Quality</span>
                        </div>
                        <RatingStars rating={categoryScores.food} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Service</span>
                        </div>
                        <RatingStars rating={categoryScores.service} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-medium">Atmosphere</span>
                        </div>
                        <RatingStars rating={categoryScores.atmosphere} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Music className="h-4 w-4 text-pink-500" />
                          <span className="text-sm font-medium">Entertainment</span>
                        </div>
                        <RatingStars rating={categoryScores.entertainment} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard 
                  title="Monthly Growth" 
                  value={performanceTrends.length > 1 ? 
                    `${((performanceTrends[performanceTrends.length - 1].totalReviews / performanceTrends[performanceTrends.length - 2].totalReviews - 1) * 100).toFixed(1)}%` : "0%"} 
                  icon={TrendingUp} 
                />
                <MetricCard 
                  title="Best Month" 
                  value={performanceTrends.length > 0 ? 
                    performanceTrends.reduce((best, current) => current.averageRating > best.averageRating ? current : best).month : "N/A"} 
                  icon={Award} 
                />
                <MetricCard 
                  title="Consistency Score" 
                  value={performanceTrends.length > 0 ? 
                    (5 - (performanceTrends.reduce((acc, curr, i, arr) => 
                      i === 0 ? acc : acc + Math.abs(curr.averageRating - arr[i-1].averageRating), 0) / (performanceTrends.length - 1 || 1))).toFixed(1) : "5.0"} 
                  icon={Activity} 
                />
                <MetricCard 
                  title="Peak Performance" 
                  value={performanceTrends.length > 0 ? 
                    Math.max(...performanceTrends.map(t => t.averageRating)).toFixed(1) : "0"} 
                  icon={Star} 
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Performance Trends</CardTitle>
                    <CardDescription>Average rating and review volume over time</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {performanceTrends.map((trend, index) => (
                      <div key={trend.month} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{trend.totalReviews} reviews</Badge>
                            <RatingStars rating={trend.averageRating} />
                          </div>
                        </div>
                        <Progress value={mounted && trend.positiveRate ? trend.positiveRate : 0} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {trend.positiveRate.toFixed(1)}% positive feedback
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>Key performance indicators breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {[
                        { label: "Food Quality Scores", value: data.filter(r => r.food_quality?.trim()).length, total: data.length, color: "orange" },
                        { label: "Service Quality", value: data.filter(r => r.service?.trim()).length, total: data.length, color: "green" },
                        { label: "Atmosphere Feedback", value: data.filter(r => r.atmosphere?.trim()).length, total: data.length, color: "purple" },
                        { label: "Entertainment Reviews", value: data.filter(r => r.music_and_entertainment?.trim()).length, total: data.length, color: "pink" }
                      ].map((metric) => (
                        <div key={metric.label} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{metric.label}</span>
                            <span className="text-sm text-muted-foreground">{metric.value}/{metric.total}</span>
                          </div>
                          <Progress value={mounted ? (metric.value / metric.total) * 100 : 0} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="customers" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard 
                  title="Total Customers" 
                  value={calculatedMetrics.uniqueCustomers} 
                  icon={Users} 
                />
                <MetricCard 
                  title="Returning Customers" 
                  value={mounted ? topCustomers.filter(c => c.totalReviews > 1).length : 0} 
                  icon={Award} 
                />
                <MetricCard 
                  title="Average Reviews per Customer" 
                  value={mounted ? (data.length / calculatedMetrics.uniqueCustomers || 0).toFixed(1) : "0"} 
                  icon={MessageSquare} 
                />
                <MetricCard 
                  title="Most Active Customer" 
                  value={mounted && topCustomers.length > 0 ? topCustomers[0].totalReviews : 0} 
                  icon={Star} 
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Customers</CardTitle>
                    <CardDescription>Most engaged customers by review count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topCustomers.slice(0, 10).map((customer, index) => (
                        <div key={customer.customer_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">{customer.customer_name}</p>
                              <p className="text-sm text-muted-foreground">{customer.customer_email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">{customer.totalReviews} reviews</Badge>
                            </div>
                            <RatingStars rating={customer.averageRating} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer Engagement</CardTitle>
                    <CardDescription>Customer behavior and engagement patterns</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Single Review Customers</span>
                        <span className="text-sm text-muted-foreground">
                          {topCustomers.filter(c => c.totalReviews === 1).length} ({mounted ? ((topCustomers.filter(c => c.totalReviews === 1).length / topCustomers.length) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                      <Progress value={mounted ? (topCustomers.filter(c => c.totalReviews === 1).length / topCustomers.length) * 100 : 0} className="h-2" />
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Repeat Customers</span>
                        <span className="text-sm text-muted-foreground">
                          {topCustomers.filter(c => c.totalReviews > 1).length} ({mounted ? ((topCustomers.filter(c => c.totalReviews > 1).length / topCustomers.length) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                      <Progress value={mounted ? (topCustomers.filter(c => c.totalReviews > 1).length / topCustomers.length) * 100 : 0} className="h-2" />
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Highly Engaged (3+ reviews)</span>
                        <span className="text-sm text-muted-foreground">
                          {topCustomers.filter(c => c.totalReviews >= 3).length} ({mounted ? ((topCustomers.filter(c => c.totalReviews >= 3).length / topCustomers.length) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                      <Progress value={mounted ? (topCustomers.filter(c => c.totalReviews >= 3).length / topCustomers.length) * 100 : 0} className="h-2" />
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-3">Recent Activity</h4>
                      <div className="space-y-2">
                        {data.slice(0, 5).map((review) => (
                          <div key={review.id} className="flex items-center justify-between text-sm">
                            <span>{review.customer_name}</span>
                            <span className="text-muted-foreground">
                              {new Date(review.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard 
                  title="This Month vs Last" 
                  value={performanceTrends.length >= 2 ? 
                    `${((performanceTrends[performanceTrends.length - 1].averageRating / performanceTrends[performanceTrends.length - 2].averageRating - 1) * 100).toFixed(1)}%` : "0%"} 
                  trend={performanceTrends.length >= 2 && performanceTrends[performanceTrends.length - 1].averageRating > performanceTrends[performanceTrends.length - 2].averageRating ? "positive" : "negative"}
                  icon={TrendingUp} 
                />
                <MetricCard 
                  title="Peak Rating Month" 
                  value={performanceTrends.length > 0 ? 
                    new Date(performanceTrends.reduce((best, current) => current.averageRating > best.averageRating ? current : best).month).toLocaleDateString('en-US', { month: 'short' }) : "N/A"} 
                  icon={Star} 
                />
                <MetricCard 
                  title="Review Volume Trend" 
                  value={performanceTrends.length >= 2 ? 
                    (performanceTrends[performanceTrends.length - 1].totalReviews > performanceTrends[performanceTrends.length - 2].totalReviews ? "↗" : "↘") + " " +
                    Math.abs(((performanceTrends[performanceTrends.length - 1].totalReviews / performanceTrends[performanceTrends.length - 2].totalReviews - 1) * 100)).toFixed(1) + "%" : "0%"} 
                  icon={BarChart3} 
                />
                <MetricCard 
                  title="Satisfaction Trend" 
                  value={performanceTrends.length >= 2 ? 
                    (performanceTrends[performanceTrends.length - 1].positiveRate > performanceTrends[performanceTrends.length - 2].positiveRate ? "↗" : "↘") + " " +
                    Math.abs(performanceTrends[performanceTrends.length - 1].positiveRate - performanceTrends[performanceTrends.length - 2].positiveRate).toFixed(1) + "%" : "0%"} 
                  icon={Activity} 
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Trends Analysis</CardTitle>
                    <CardDescription>Rating and volume trends over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {performanceTrends.map((trend, index) => {
                        const prevTrend = performanceTrends[index - 1]
                        const ratingChange = prevTrend ? trend.averageRating - prevTrend.averageRating : 0
                        const volumeChange = prevTrend ? trend.totalReviews - prevTrend.totalReviews : 0
                        
                        return (
                          <div key={trend.month} className="border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium">
                                {new Date(trend.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{trend.totalReviews} reviews</Badge>
                                {volumeChange !== 0 && (
                                  <Badge variant={volumeChange > 0 ? "default" : "secondary"}>
                                    {volumeChange > 0 ? "+" : ""}{volumeChange}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <RatingStars rating={trend.averageRating} />
                              {ratingChange !== 0 && (
                                <span className={`text-sm ${ratingChange > 0 ? "text-green-600" : "text-red-600"}`}>
                                  {ratingChange > 0 ? "+" : ""}{ratingChange.toFixed(2)}
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-2">
                              <Progress value={mounted ? trend.positiveRate : 0} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {mounted ? trend.positiveRate.toFixed(1) : 0}% positive feedback
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Seasonal Patterns</CardTitle>
                    <CardDescription>Identify patterns by month and season</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { season: "Spring (Mar-May)", months: [2, 3, 4], color: "green" },
                        { season: "Summer (Jun-Aug)", months: [5, 6, 7], color: "yellow" },
                        { season: "Fall (Sep-Nov)", months: [8, 9, 10], color: "orange" },
                        { season: "Winter (Dec-Feb)", months: [11, 0, 1], color: "blue" }
                      ].map((season) => {
                        const seasonData = data.filter(review => 
                          season.months.includes(new Date(review.timestamp).getMonth())
                        )
                        const avgRating = seasonData.length > 0 ? 
                          seasonData.reduce((sum, review) => sum + review.sentiment_score, 0) / seasonData.length : 0
                        const reviewCount = seasonData.length
                        
                        return (
                          <div key={season.season} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{season.season}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">{reviewCount} reviews</span>
                                <RatingStars rating={avgRating} />
                              </div>
                            </div>
                            <Progress value={mounted && data.length > 0 ? (reviewCount / data.length) * 100 : 0} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-800 flex items-center space-x-2">
                      <Award className="h-5 w-5" />
                      <span>Strengths</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">High satisfaction rate</span>
                        <Badge variant="outline" className="text-green-700">
                          {calculatedMetrics.positiveRate.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Customer loyalty</span>
                        <Badge variant="outline" className="text-green-700">
                          {mounted ? topCustomers.filter(c => c.totalReviews > 1).length : 0} repeat customers
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Average rating</span>
                        <Badge variant="outline" className="text-green-700">
                          {calculatedMetrics.averageRating.toFixed(1)}/5
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-orange-800 flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Opportunities</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Response to critics</span>
                        <Badge variant="outline" className="text-orange-700">
                          {calculatedMetrics.criticalIssues} pending
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Feedback collection</span>
                        <Badge variant="outline" className="text-orange-700">
                          {mounted ? ((data.filter(r => r.improvement_suggestions?.trim()).length / data.length) * 100).toFixed(1) : 0}% have suggestions
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Customer engagement</span>
                        <Badge variant="outline" className="text-orange-700">
                          {mounted ? ((topCustomers.filter(c => c.totalReviews > 1).length / calculatedMetrics.uniqueCustomers) * 100).toFixed(1) : 0}% return rate
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-800 flex items-center space-x-2">
                      <BookOpen className="h-5 w-5" />
                      <span>Recommendations</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="p-2 bg-white rounded border">
                        <p className="font-medium">Priority: High</p>
                        <p>Address {calculatedMetrics.criticalIssues} critical reviews immediately</p>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <p className="font-medium">Priority: Medium</p>
                        <p>Implement feedback from {mounted ? data.filter(r => r.improvement_suggestions?.trim()).length : 0} customer suggestions</p>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <p className="font-medium">Priority: Low</p>
                        <p>Increase engagement with single-visit customers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Customer Suggestions</CardTitle>
                    <CardDescription>Most frequently mentioned improvement areas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data
                        .filter(review => review.improvement_suggestions?.trim())
                        .slice(0, 5)
                        .map((review) => (
                          <div key={review.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{review.customer_name}</span>
                              <RatingStars rating={review.sentiment_score} />
                            </div>
                            <p className="text-sm text-muted-foreground">{review.improvement_suggestions}</p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Action Items</CardTitle>
                    <CardDescription>Recommended next steps based on data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          category: "Customer Service",
                          action: "Train staff on handling complaints effectively",
                          priority: "High",
                          impact: "Will address " + calculatedMetrics.criticalIssues + " critical issues"
                        },
                        {
                          category: "Food Quality",
                          action: "Review menu items with lowest ratings",
                          priority: "Medium",
                          impact: "Potential to increase average rating by 0.2-0.5 points"
                        },
                        {
                          category: "Customer Retention",
                          action: "Implement loyalty program for repeat customers",
                          priority: "Medium",
                          impact: "Target " + (mounted ? topCustomers.filter(c => c.totalReviews === 1).length : 0) + " single-visit customers"
                        },
                        {
                          category: "Feedback System",
                          action: "Create formal response process for reviews",
                          priority: "Low",
                          impact: "Improve customer satisfaction and show responsiveness"
                        }
                      ].map((item, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{item.category}</span>
                            <Badge variant={item.priority === "High" ? "destructive" : item.priority === "Medium" ? "default" : "secondary"}>
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{item.action}</p>
                          <p className="text-xs text-muted-foreground">{item.impact}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-red-800 flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Critical Issues</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-800">{calculatedMetrics.criticalIssues}</div>
                    <p className="text-sm text-red-600">Requires immediate attention</p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-orange-800 flex items-center space-x-2">
                      <Clock className="h-5 w-5" />
                      <span>Needs Response</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-800">{criticalReviews.length}</div>
                    <p className="text-sm text-orange-600">Recent negative reviews</p>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-800 flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5" />
                      <span>Improvement Ideas</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-800">
                      {data.filter((review) => review.improvement_suggestions?.trim()).length}
                    </div>
                    <p className="text-sm text-blue-600">Customer suggestions</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span>Recent Critical Reviews</span>
                  </CardTitle>
                  <CardDescription>Reviews requiring immediate attention</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {criticalReviews.length > 0 ? (
                    criticalReviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div>
                              <p className="font-medium">{review.customer_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(review.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="destructive" className="flex items-center space-x-1">
                              <Star className="h-3 w-3" />
                              <span>{review.sentiment_score}/5</span>
                            </Badge>
                          </div>
                          <Button size="sm" variant="outline">
                            Mark Addressed
                          </Button>
                        </div>
                        <p className="text-sm">{review.summary}</p>
                        {(review.customer_email || review.customer_phone) && (
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {review.customer_email && (
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{review.customer_email}</span>
                              </div>
                            )}
                            {review.customer_phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{review.customer_phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No critical reviews found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-analysis" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-blue-500" />
                      <span>AI Analysis Setup</span>
                    </CardTitle>
                    <CardDescription>Configure AI-powered review analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        AI analysis requires an OpenAI API key to generate intelligent summaries of customer feedback.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label htmlFor="api-key">OpenAI API Key</Label>
                      <Input 
                        id="api-key" 
                        type="password" 
                        placeholder="Enter your OpenAI API key..." 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={generateAiAnalysis}
                      disabled={aiLoading || !apiKey.trim()}
                    >
                      {aiLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Generate AI Analysis
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Categories</CardTitle>
                    <CardDescription>AI will analyze these aspects of customer feedback</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                      <ChefHat className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Food Quality</p>
                        <p className="text-sm text-muted-foreground">
                          {data.filter((r) => r.food_quality?.trim()).length} reviews to analyze
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <Users className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Service</p>
                        <p className="text-sm text-muted-foreground">
                          {data.filter((r) => r.service?.trim()).length} reviews to analyze
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                      <Clock className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Atmosphere</p>
                        <p className="text-sm text-muted-foreground">
                          {data.filter((r) => r.atmosphere?.trim()).length} reviews to analyze
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-pink-50 rounded-lg">
                      <Music className="h-5 w-5 text-pink-600" />
                      <div>
                        <p className="font-medium">Entertainment</p>
                        <p className="text-sm text-muted-foreground">
                          {data.filter((r) => r.music_and_entertainment?.trim()).length} reviews to analyze
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {aiAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-blue-500" />
                      <span>AI Analysis Results</span>
                    </CardTitle>
                    <CardDescription>Generated insights from your customer feedback</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <Textarea 
                        value={aiAnalysis} 
                        readOnly 
                        className="min-h-[400px] text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Analysis Statistics</CardTitle>
                  <CardDescription>Overview of available data for AI analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{data.length}</div>
                      <p className="text-sm text-muted-foreground">Total Reviews</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {data.filter((r) => r.sentiment_score >= 4).length}
                      </div>
                      <p className="text-sm text-muted-foreground">Positive Reviews</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {data.filter((r) => r.improvement_suggestions?.trim()).length}
                      </div>
                      <p className="text-sm text-muted-foreground">Improvement Suggestions</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {new Set(data.map((r) => r.customer_id)).size}
                      </div>
                      <p className="text-sm text-muted-foreground">Unique Customers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : !loading && !error ? (
          <div className="text-center py-12">
            <FileSpreadsheet className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-500 mb-2">
              Please check the file path in the code to ensure it points to your Excel file
            </p>
            <p className="text-sm text-muted-foreground">
              Current file path: "/Complete reviews.xlsx" (should be in public folder)
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}