"use client"

import { useState, useEffect, useMemo } from "react"
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
  const [currentStep, setCurrentStep] = useState("center") // center or students
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
      const sorted = (data.students || [])
        .filter(student => student && typeof student === 'object')
        .slice()
        .sort((a, b) =>
          (a?.firstName || "").localeCompare(b?.firstName || "")
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
      if (!student || typeof student !== 'object') return false
      const first = (student?.firstName || '').toLowerCase()
      const last = (student?.lastName || '').toLowerCase()
      const fullName = `${first} ${last}`.trim()
      const term = searchTerm.trim().toLowerCase()
      // If the user clicked an alphabet letter (single A-Z), match FIRST NAME that STARTS with that letter
      if (term.length === 1 && term >= 'a' && term <= 'z') {
        return first.startsWith(term)
      }
      // For typed searches (multi-character), keep the broader contains behavior across full name
      return fullName.includes(term)
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
  const isLetterFilter = (() => {
    const term = searchTerm.trim()
    return term.length === 1 && /[a-z]/i.test(term)
  })()

  const letterHasMatches = useMemo(() => {
    const map = Object.fromEntries(
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => [l, false])
    )
    for (const s of students) {
      if (!s || typeof s !== "object") continue
      const first = (s?.firstName || "").trim().toUpperCase()
      const f0 = first[0]
      if (f0 && /[A-Z]/.test(f0)) map[f0] = true
    }
    return map
  }, [students])

  if (currentStep === "center") {
    return (
      <div className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto">
        <Card className="w-full rounded-2xl shadow-md border bg-card">
          <CardHeader className="text-center space-y-4 p-8">
            <CardTitle className="flex items-center justify-center gap-2 text-3xl font-bold">
              <MapPin className="size-7" />
              Select Your Center
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Choose the Mathnasium center you're visiting today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-5" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <label className="text-lg font-semibold">Center Location</label>
              {loading.centers ? (
                <Skeleton className="h-12 w-full rounded-md" />
              ) : (
                <Select value={selectedCenter} onValueChange={handleCenterSelect}>
                  <SelectTrigger className="w-full h-12 rounded-md text-lg font-medium shadow-sm">
                    <SelectValue placeholder="Choose a center..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[60vh] w-full rounded-md shadow-lg z-[100]" position="item-aligned">
                    {centers.map((center, index) => (
                      <SelectItem key={index} value={center} className="py-3 text-lg">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-5" />
                          {center}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {centers.length > 0 && !loading.centers && (
              <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground">
                <Users className="size-5" />
                <span>{centers.length} centers available</span>
              </div>
            )}

            {selectedCenter && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="size-5 text-green-600" />
                    <span className="font-semibold text-lg">Selected Center</span>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1 rounded-md">
                    {selectedCenter}
                  </Badge>
                </div>
                
                <Button onClick={handleContinue} className="w-full h-12 text-lg rounded-md" size="lg">
                  Continue to Check-In
                </Button>
              </div>
            )}

            {!loading.centers && centers.length === 0 && !error && (
              <div className="text-center py-6 text-muted-foreground">
                <MapPin className="size-10 mx-auto mb-2 opacity-50" />
                <p className="text-lg">No centers available at this time.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="w-full max-w-3xl mx-auto">
        <Card className="w-full rounded-2xl shadow-md border bg-card">
          {currentStep === "center" ? (
            <>
              <CardHeader className="text-center space-y-4 p-8">
                <CardTitle className="flex items-center justify-center gap-2 text-3xl font-bold">
                  <MapPin className="size-7" />
                  Select Your Center
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                  Choose the Mathnasium center you're visiting today
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="size-5" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <label className="text-lg font-semibold">Center Location</label>
                  {loading.centers ? (
                    <Skeleton className="h-12 w-full rounded-md" />
                  ) : (
                    <Select value={selectedCenter} onValueChange={handleCenterSelect}>
                      <SelectTrigger className="w-full h-12 rounded-md text-lg font-medium shadow-sm">
                        <SelectValue placeholder="Choose a center..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[60vh] w-full rounded-md shadow-lg z-[100]" position="item-aligned">
                        {centers.map((center, index) => (
                          <SelectItem key={index} value={center} className="py-3 text-lg">
                            <div className="flex items-center gap-2">
                              <MapPin className="size-5" />
                              {center}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {centers.length > 0 && !loading.centers && (
                  <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground">
                    <Users className="size-5" />
                    <span>{centers.length} centers available</span>
                  </div>
                )}

                {selectedCenter && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="size-5 text-green-600" />
                        <span className="font-semibold text-lg">Selected Center</span>
                      </div>
                      <Badge variant="secondary" className="text-lg px-3 py-1 rounded-md">
                        {selectedCenter}
                      </Badge>
                    </div>
                    
                    <Button onClick={handleContinue} className="w-full h-12 text-lg rounded-md" size="lg">
                      Continue to Check-In
                    </Button>
                  </div>
                )}

                {!loading.centers && centers.length === 0 && !error && (
                  <div className="text-center py-6 text-muted-foreground">
                    <MapPin className="size-10 mx-auto mb-2 opacity-50" />
                    <p className="text-lg">No centers available at this time.</p>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-2 p-6">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <Badge variant="secondary" className="text-sm px-2 py-0.5 rounded-md">
                    {selectedCenter}
                  </Badge>
                </div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <UserCheck className="size-6" />
                  Student Check-In
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                  Find and check in students for {selectedCenter}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
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
                          <strong>Filter Active:</strong>{" "}
                          {isLetterFilter ? (
                            <>
                              Letter “{searchTerm.toUpperCase()}” (starts with)
                            </>
                          ) : (
                            <>Search for “{searchTerm}”</>
                          )}
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
                    className="pl-12 h-12 text-lg rounded-md"
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

                <div className="flex flex-wrap gap-2 justify-center p-4 bg-muted rounded-md">
                  {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => {
          const disabled = !letterHasMatches[letter]
                    const active = !disabled && isLetterFilter && searchTerm.trim().toUpperCase() === letter
                    return (
                      <Button
                        key={letter}
                        variant={active ? "default" : "ghost"}
                        size="lg"
                        aria-pressed={active}
                        disabled={disabled}
            title={disabled ? `No first names starting with ${letter}` : undefined}
                        className={`h-12 w-12 min-w-[3rem] min-h-[3rem] text-xl font-bold rounded-full flex items-center justify-center ${active ? "ring-2 ring-primary" : ""} ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
                        onClick={() => {
                          if (disabled) return
                          const current = searchTerm.trim().toUpperCase()
                          setSearchTerm(current === letter ? "" : letter)
                        }}
                      >
                        {letter}
                      </Button>
                    )
                  })}
                  <Button
                    variant="ghost"
                    size="lg"
                    className="h-12 px-4 min-w-[3rem] min-h-[3rem] text-xl font-bold rounded-full flex items-center justify-center"
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                </div>

                {loading.students ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-md" />
                    ))}
                  </div>
                ) : filteredStudents.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary" className="text-sm px-2 py-0.5 rounded-md">
                        {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
                        {hasActiveFilters && " (filtered)"}
                      </Badge>
                    </div>
                    <div className="relative">
                      <ScrollArea className="h-[50vh] w-full rounded-md">
                        <div className="divide-y divide-border">
                          {filteredStudents.map((student, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-4 py-4 px-2 w-full"
                            >
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-xl tracking-tight text-primary">
                                  {`${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Unknown Student'}
                                </h3>
                                <div className="text-sm font-medium text-muted-foreground space-y-1">
                                  <div>ID: {student?.studentId || 'No ID'}</div>
                                  <div>Last Attendance: {student?.lastAttendance || <span className="italic">Never</span>}</div>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleCheckIn(student)}
                                className="shrink-0 w-32 h-10 text-lg font-bold rounded-md"
                                size="sm"
                                disabled={!student?.studentId || student?.studentId.trim() === ""}
                              >
                                <UserCheck className="size-4 mr-2" />
                                Check In
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none"></div>
                    </div>
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
                    <Button variant="outline" onClick={clearFilters} className="mt-4" size="sm">
                      Clear Search
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
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
