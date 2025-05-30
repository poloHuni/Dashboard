"use client"
import dynamic from 'next/dynamic'
import { Card, CardContent } from "@/components/ui/card"

// Dynamically import the dashboard with no SSR
const RestaurantDashboard = dynamic(() => import('./RestaurantDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-6 py-8">
        <Card className="mb-8">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
              <p className="text-lg font-medium">Loading Restaurant Analytics...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Initializing dashboard components...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})

export default function Page() {
  return <RestaurantDashboard />
}