"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Download, AlertCircle, Database, Upload, Users, ChevronUp, ChevronDown } from "lucide-react"
import { QRUploadTab } from "@/components/admin/QRUploadTab"
import { MassQRUploadTab } from "@/components/admin/MassQRUploadTab"

export function DataDisplay() {
  const [studentData, setStudentData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" })
  const [currentView, setCurrentView] = useState("upload")

  useEffect(() => {
    fetchStudentData()
  }, [])

  const fetchStudentData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/students')
      if (!response.ok) throw new Error('Failed to fetch student data')
      
      const data = await response.json()
      const headers = data.students[0] || []
      const rows = data.students.slice(1) || []

      // Extract relevant columns
      const studentIdIndex = headers.findIndex(h => h.toLowerCase().trim() === "student id")
      const firstNameIndex = headers.findIndex(h => h.toLowerCase().trim() === "first name")
      const lastNameIndex = headers.findIndex(h => h.toLowerCase().trim() === "last name")
      const gradeIndex = headers.findIndex(h => h.toLowerCase().trim() === "grade")
      const centerIndex = headers.findIndex(h => h.toLowerCase().trim() === "center")
      const qrCodeIndex = headers.findIndex(h => h.toLowerCase().trim() === "qr code")

      const extractedData = rows.map(row => ({
        studentId: row[studentIdIndex] || "-",
        studentName: `${row[firstNameIndex] || ""} ${row[lastNameIndex] || ""}`.trim() || "-",
        grade: row[gradeIndex] || "-",
        center: row[centerIndex] || "-",
        qrCode: row[qrCodeIndex] || "-"
      }))

      // Group data by center
      const groupedData = extractedData.sort((a, b) => a.center.localeCompare(b.center))
      setStudentData(groupedData)
    } catch (err) {
      setError(err.message)
      setStudentData([])
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (key) => {
    let direction = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })

    const sortedData = [...studentData].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1
      return 0
    })
    setStudentData(sortedData)
  }

  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) return
    
    const csvHeaders = ["Student Id", "Student Name", "Grade", "Center", "QR Code"]
    const csvRows = data.map(row => [
      row.studentId,
      row.studentName,
      row.grade,
      row.center,
      row.qrCode
    ])
    const csv = [csvHeaders, ...csvRows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const renderSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? <ChevronUp className="size-4 ml-1 inline" /> : <ChevronDown className="size-4 ml-1 inline" />
    }
    return null
  }

  return (
    <div className="space-y-6">
      {currentView === "mass-upload" ? (
        <MassQRUploadTab onBack={() => setCurrentView("upload")} />
      ) : (
        <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="size-4" />
              Upload QR Code
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="size-4" />
              Student Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <QRUploadTab onNavigateToMassUpload={() => setCurrentView("mass-upload")} />
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="size-5" />
                    Student Data
                  </CardTitle>
                  <CardDescription>
                    View and manage student information from Google Sheets
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => downloadCSV(studentData, 'student-data.csv')}
                    disabled={!studentData.length}
                  >
                    <Download className="size-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button onClick={fetchStudentData} disabled={loading}>
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : studentData.length > 0 ? (
                  <ScrollArea className="h-[60vh] w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead onClick={() => handleSort("studentId")} className="cursor-pointer">
                            Student Id {renderSortIcon("studentId")}
                          </TableHead>
                          <TableHead onClick={() => handleSort("studentName")} className="cursor-pointer">
                            Student Name {renderSortIcon("studentName")}
                          </TableHead>
                          <TableHead onClick={() => handleSort("grade")} className="cursor-pointer">
                            Grade {renderSortIcon("grade")}
                          </TableHead>
                          <TableHead onClick={() => handleSort("center")} className="cursor-pointer">
                            Center {renderSortIcon("center")}
                          </TableHead>
                          <TableHead onClick={() => handleSort("qrCode")} className="cursor-pointer">
                            QR Code {renderSortIcon("qrCode")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentData.map((row, index) => (
                          <TableRow key={index} className={row.qrCode === "-" ? "bg-red-50" : ""}>
                            <TableCell>{row.studentId}</TableCell>
                            <TableCell>{row.studentName}</TableCell>
                            <TableCell>{row.grade}</TableCell>
                            <TableCell>{row.center}</TableCell>
                            <TableCell>
                              {row.qrCode !== "-" ? (
                                <a href={row.qrCode} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                  View QR Code
                                </a>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="size-12 mx-auto mb-4 opacity-50" />
                    <p>No student data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
