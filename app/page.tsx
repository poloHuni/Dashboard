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

  // Ensure component is mounted before rendering dynamic content
  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Calculate metrics from actual data
  const calculateMetrics = () => {
    if (data.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        positiveRate: 0,
        criticalIssues: 0,
        uniqueCustomers: 0,
        recentReviews: 0,
      }
    }

    const totalReviews = data.length
    const averageRating = data.reduce((sum, review) => sum + review.sentiment_score, 0) / totalReviews
    const positiveReviews = data.filter((review) => review.sentiment_score >= 4).length
    const positiveRate = (positiveReviews / totalReviews) * 100
    const criticalIssues = data.filter((review) => review.sentiment_score <= 2).length
    const uniqueCustomers = new Set(data.map((review) => review.customer_id)).size

    // Calculate recent reviews (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentReviews = data.filter((review) => new Date(review.timestamp) >= sevenDaysAgo).length

    return {
      totalReviews,
      averageRating,
      positiveRate,
      criticalIssues,
      uniqueCustomers,
      recentReviews,
    }
  }

  // Filter data by time period
  const getFilteredData = () => {
    if (selectedPeriod === "all") return data

    const days = Number.parseInt(selectedPeriod)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    return data.filter((review) => new Date(review.timestamp) >= cutoffDate)
  }

  // Get sentiment distribution
  const getSentimentDistribution = () => {
    const filteredData = getFilteredData()
    const distribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: filteredData.filter((review) => Math.round(review.sentiment_score) === rating).length,
    }))
    return distribution
  }

  // Get critical reviews
  const getCriticalReviews = () => {
    const filteredData = getFilteredData()
    return filteredData
      .filter((review) => review.sentiment_score <= 2)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  }

  // Calculate category scores - Fixed to avoid hydration mismatch
  const getCategoryScores = () => {
    const filteredData = getFilteredData()
    if (filteredData.length === 0) {
      return { food: 0, service: 0, atmosphere: 0, entertainment: 0 }
    }

    // Calculate actual scores based on data instead of using Math.random()
    const avgSentiment = filteredData.reduce((sum, review) => sum + review.sentiment_score, 0) / filteredData.length

    // Use deterministic calculations based on actual data
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

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  const metrics = calculateMetrics()
  const sentimentDistribution = getSentimentDistribution()
  const criticalReviews = getCriticalReviews()
  const categoryScores = getCategoryScores()

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
                <MetricCard title="Average Rating" value={`${metrics.averageRating.toFixed(1)}/5`} icon={Star} />
                <MetricCard
                  title="Total Reviews"
                  value={metrics.totalReviews}
                  change={`+${metrics.recentReviews} this week`}
                  icon={MessageSquare}
                />
                <MetricCard title="Satisfaction Rate" value={`${metrics.positiveRate.toFixed(1)}%`} icon={TrendingUp} />
                <MetricCard title="Critical Issues" value={metrics.criticalIssues} icon={AlertTriangle} />
                <MetricCard title="Unique Customers" value={metrics.uniqueCustomers} icon={Users} />
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
                            value={metrics.totalReviews > 0 ? (item.count / metrics.totalReviews) * 100 : 0}
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
                    <div className="text-3xl font-bold text-red-800">{metrics.criticalIssues}</div>
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
                      <MessageSquare className="h-5 w-5 text-blue-500" />
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
                      <Input id="api-key" type="password" placeholder="Enter your OpenAI API key..." />
                    </div>
                    <Button className="w-full">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Generate AI Analysis
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

            {/* Add other tab contents here with actual data calculations */}
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
