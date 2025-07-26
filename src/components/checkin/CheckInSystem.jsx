"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, Users, AlertCircle, CheckCircle2, Search, ArrowLeft, UserCheck, X, Filter } from "lucide-react"
import { CheckInModal } from "@/components/checkin/CheckInModal"

export function CheckInSystem() {
  const [centers, setCenters] = useState([])
  const [selectedCenter, setSelectedCenter] = useState("")
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState({ centers: true, students: false })
  const [error, setError] = useState(null)
  const [currentStep, setCurrentStep] = useState("center") // "center" or "students"
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showCheckInModal, setShowCheckInModal] = useState(false)

  useEffect(() => {
    fetchCenters()
  }, [])

  useEffect(() => {
    if (selectedCenter && currentStep === "students") {
      fetchStudents()
    }
  }, [selectedCenter, currentStep])

  useEffect(() => {
    filterStudents()
  }, [students, searchTerm])

  const fetchCenters = async () => {
    setLoading(prev => ({ ...prev, centers: true }))
    setError(null)
    
    try {
      const response = await fetch('/api/centers')
      if (!response.ok) throw new Error('Failed to fetch centers')
      
      const data = await response.json()
      setCenters(data.centers || [])
    } catch (err) {
      setError(err.message)
      setCenters([])
    } finally {
      setLoading(prev => ({ ...prev, centers: false }))
    }
  }

  const fetchStudents = async () => {
    setLoading(prev => ({ ...prev, students: true }))
    setError(null)
    
    try {
      const response = await fetch(`/api/students/by-center?center=${encodeURIComponent(selectedCenter)}`)
      if (!response.ok) throw new Error('Failed to fetch students')
      
      const data = await response.json()
      const sorted = (data.students || []).slice().sort((a, b) =>
        (a.firstName || "").localeCompare(b.firstName || "")
      )
      setStudents(sorted)
    } catch (err) {
      setError(err.message)
      setStudents([])
    } finally {
      setLoading(prev => ({ ...prev, students: false }))
    }
  }

  const filterStudents = () => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students)
      return
    }

    const filtered = students.filter(student => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase()
      return fullName.includes(searchTerm.toLowerCase())
    })
    setFilteredStudents(filtered)
  }

  const handleCenterSelect = (center) => {
    setSelectedCenter(center)
  }

  const handleContinue = () => {
    if (selectedCenter) {
      setCurrentStep("students")
    }
  }

  const handleBack = () => {
    setCurrentStep("center")
    setSearchTerm("")
    setStudents([])
    setFilteredStudents([])
  }

  const handleCheckIn = (student) => {
    setSelectedStudent(student)
    setShowCheckInModal(true)
  }

  const handleModalClose = () => {
    setShowCheckInModal(false)
    setSelectedStudent(null)
  }

  const clearFilters = () => {
    setSearchTerm("")
  }

  const hasActiveFilters = searchTerm.trim() !== ""

  // Center Selection Step
  if (currentStep === "center") {
    return (
      <div className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto">
        <Card className="w-full rounded-2xl shadow-lg border-2 border-primary/10 md:p-8 lg:p-12">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl sm:text-3xl md:text-4xl">
              <MapPin className="size-6 sm:size-7 md:size-8" />
              Select Your Center
            </CardTitle>
            <CardDescription className="text-base sm:text-lg md:text-xl">
              Choose the Mathnasium center you're visiting today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-5 md:size-6" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <label className="text-base font-semibold md:text-lg">Center Location</label>
              {loading.centers ? (
                <Skeleton className="h-14 md:h-16 w-full rounded-lg" />
              ) : (
                <Select value={selectedCenter} onValueChange={handleCenterSelect}>
                  <SelectTrigger className="w-full h-14 md:h-16 rounded-lg text-lg md:text-xl font-medium shadow-md border-2 border-primary/20">
                    <SelectValue placeholder="Choose a center..." />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-[60vh] w-full rounded-lg shadow-2xl z-[100] left-0 !right-0 md:text-xl"
                    position="item-aligned"
                  >
                    {centers.map((center, index) => (
                      <SelectItem key={index} value={center} className="py-4 text-lg md:text-xl">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-5 md:size-6" />
                          {center}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {centers.length > 0 && !loading.centers && (
              <div className="flex items-center justify-center gap-2 text-base md:text-lg text-muted-foreground">
                <Users className="size-5 md:size-6" />
                <span>{centers.length} centers available</span>
              </div>
            )}

            {selectedCenter && (
              <div className="space-y-4">
                <div className="p-4 md:p-6 bg-muted rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="size-5 md:size-6 text-green-600" />
                    <span className="font-semibold text-base md:text-lg">Selected Center</span>
                  </div>
                  <Badge variant="secondary" className="text-base md:text-lg px-3 py-1 rounded-lg">
                    {selectedCenter}
                  </Badge>
                </div>
                
                <Button 
                  onClick={handleContinue} 
                  className="w-full h-14 md:h-16 text-lg md:text-xl rounded-xl"
                  size="lg"
                >
                  Continue to Check-In
                </Button>
              </div>
            )}

            {!loading.centers && centers.length === 0 && !error && (
              <div className="text-center py-6 text-muted-foreground">
                <MapPin className="size-10 md:size-12 mx-auto mb-2 opacity-50" />
                <p className="text-base md:text-lg">No centers available at this time.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        <div className="w-full rounded-2xl shadow-lg border-2 border-primary/10 bg-card">
          <div className="px-4 pt-6 pb-2">
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleBack}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-base"
              >
                <ArrowLeft className="size-5" />
                Back
              </Button>
              <Badge variant="secondary" className="text-base px-3 py-1 rounded-lg">{selectedCenter}</Badge>
            </div>
            <div className="flex items-center gap-2 text-2xl sm:text-3xl font-bold mb-1">
              <UserCheck className="size-6 sm:size-7" />
              Student Check-In
            </div>
            <div className="text-base sm:text-lg text-muted-foreground mb-4">
              Find and check in students for {selectedCenter}
            </div>
          </div>
          <div className="px-4 pb-6 space-y-8">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-5" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {hasActiveFilters && (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <Filter className="size-5 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <div className="flex items-center justify-between">
                    <span>
                      <strong>Filter Active:</strong> Showing results for "{searchTerm}"
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800"
                    >
                      <X className="size-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                placeholder="Search by student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg rounded-lg"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center p-4 bg-muted rounded-xl">
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
                <Button
                  key={letter}
                  variant="ghost"
                  size="lg"
                  className="h-14 w-14 min-w-[3.5rem] min-h-[3.5rem] text-xl font-bold rounded-full flex items-center justify-center"
                  onClick={() => setSearchTerm(letter)}
                >
                  {letter}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="lg"
                className="h-14 px-6 min-w-[3.5rem] min-h-[3.5rem] text-xl font-bold rounded-full flex items-center justify-center"
                onClick={clearFilters}
              >
                Clear
              </Button>
            </div>

            {loading.students ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="space-y-0">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="secondary" className="text-base px-3 py-1 rounded-lg">
                    {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
                    {hasActiveFilters && " (filtered)"}
                  </Badge>
                </div>
                <ScrollArea className="h-[60vh] w-full rounded-xl max-w-full md:max-w-3xl mx-auto">
                  <div className="divide-y divide-border">
                    {filteredStudents.map((student, index) => (
                      <div
                        key={index}
                        className="flex flex-col md:flex-col lg:flex-row items-center justify-between gap-4 py-6 px-2 w-full"
                      >
                        <div className="flex-1 min-w-0 text-center lg:text-left">
                          <h3 className="font-extrabold text-2xl sm:text-3xl tracking-tight text-primary mb-1">
                            {student.firstName} {student.lastName}
                          </h3>
                          <div className="space-y-1 text-lg sm:text-xl font-semibold text-muted-foreground">
                            <p>
                              <span className="font-bold text-foreground">Last Attendance:</span>{" "}
                              {student.lastAttendance || <span className="italic text-muted-foreground">Never</span>}
                            </p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleCheckIn(student)}
                          className="shrink-0 w-full lg:w-64 h-14 text-lg lg:text-2xl font-bold rounded-xl"
                          size="lg"
                        >
                          <UserCheck className="size-5 mr-2" />
                          Check In
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="size-12 mx-auto mb-4 opacity-50" />
                <p>No students found for {selectedCenter}.</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="size-12 mx-auto mb-4 opacity-50" />
                <p>No students found matching "{searchTerm}".</p>
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="mt-4"
                  size="lg"
                >
                  Clear Search
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>


      <CheckInModal
        student={selectedStudent}
        open={showCheckInModal}
        onClose={handleModalClose}
        onConfirm={() => {}} 
      />
    </>
  )
}
         