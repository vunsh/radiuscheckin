"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, QrCode, Download, RefreshCcw, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"

export function DataDisplay() {
  const [studentData, setStudentData] = useState([])
  const [qrData, setQrData] = useState([])
  const [loading, setLoading] = useState({ students: false, qr: false })
  const [error, setError] = useState({ students: null, qr: null })
  const [expandedMobileRows, setExpandedMobileRows] = useState(new Set())

  useEffect(() => {
    fetchStudentData()
    fetchQRData()
  }, [])

  const fetchStudentData = async () => {
    setLoading(prev => ({ ...prev, students: true }))
    setError(prev => ({ ...prev, students: null }))
    
    try {
      const response = await fetch('/api/admin/students')
      if (!response.ok) throw new Error('Failed to fetch student data')
      
      const data = await response.json()
      setStudentData(data.students || [])
    } catch (err) {
      setError(prev => ({ ...prev, students: err.message }))
      setStudentData([])
    } finally {
      setLoading(prev => ({ ...prev, students: false }))
    }
  }

  const fetchQRData = async () => {
    setLoading(prev => ({ ...prev, qr: true }))
    setError(prev => ({ ...prev, qr: null }))
    
    try {
      const response = await fetch('/api/admin/qrcodes')
      if (!response.ok) throw new Error('Failed to fetch QR code data')
      
      const data = await response.json()
      setQrData(data.qrCodes || [])
    } catch (err) {
      setError(prev => ({ ...prev, qr: err.message }))
      setQrData([])
    } finally {
      setLoading(prev => ({ ...prev, qr: false }))
    }
  }

  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) return
    
    const csv = data.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const toggleMobileRow = (index) => {
    const newExpanded = new Set(expandedMobileRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedMobileRows(newExpanded)
  }

  const renderMobileCard = (row, index, isHeader = false) => {
    if (isHeader) return null

    return (
      <Card key={index} className="mb-3">
        <CardContent className="p-4">
          <div className="space-y-2">
            {row.map((cell, cellIndex) => (
              <div key={cellIndex} className="flex justify-between">
                <span className="font-medium text-sm">Column {cellIndex + 1}:</span>
                <span className="text-sm truncate ml-2">{cell || '-'}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderDesktopTable = (data, isQRData = false) => {
    if (data.length === 0) return null

    const headers = isQRData && data.length > 0 ? data[0] : null
    const rows = isQRData && headers ? data.slice(1) : data
    const maxColumns = Math.max(...data.map(row => row.length))

    return (
      <ScrollArea className="h-96 border rounded-md">
        <Table>
          {headers && (
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead key={index}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                {Array.from({ length: maxColumns }, (_, cellIndex) => (
                  <TableCell key={cellIndex} className="max-w-48 truncate whitespace-nowrap">
                    {row[cellIndex] || '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    )
  }

  return (
    <Tabs defaultValue="students" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="students" className="flex items-center gap-2">
          <Users className="size-4" />
          <span className="hidden sm:inline">Student Data</span>
          <span className="sm:hidden">Students</span>
        </TabsTrigger>
        <TabsTrigger value="qrcodes" className="flex items-center gap-2">
          <QrCode className="size-4" />
          <span className="hidden sm:inline">QR Codes</span>
          <span className="sm:hidden">QR Codes</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="students">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  Student Database
                </CardTitle>
                <CardDescription>
                  View and manage student information from Google Sheets
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={fetchStudentData}
                  disabled={loading.students}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <RefreshCcw className="size-4" />
                  {loading.students ? 'Loading...' : 'Refresh'}
                </Button>
                <Button
                  onClick={() => downloadCSV(studentData, 'student-data.csv')}
                  disabled={studentData.length === 0}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Download className="size-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error.students && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="size-4" />
                <AlertDescription>{error.students}</AlertDescription>
              </Alert>
            )}
            
            {loading.students ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : studentData.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">
                    {studentData.length} records found
                  </Badge>
                </div>
                
                <div className="hidden md:block overflow-x-auto">
                  {renderDesktopTable(studentData)}
                </div>
                
                <div className="md:hidden">
                  <ScrollArea className="h-96">
                    {studentData.map((row, index) => renderMobileCard(row, index))}
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="size-12 mx-auto mb-4 opacity-50" />
                <p>No student data available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="qrcodes">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="size-5" />
                  QR Code Management
                </CardTitle>
                <CardDescription>
                  View and manage QR codes for check-in system
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={fetchQRData}
                  disabled={loading.qr}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <RefreshCcw className="size-4" />
                  {loading.qr ? 'Loading...' : 'Refresh'}
                </Button>
                <Button
                  onClick={() => downloadCSV(qrData, 'qr-codes.csv')}
                  disabled={qrData.length === 0}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Download className="size-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error.qr && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="size-4" />
                <AlertDescription>{error.qr}</AlertDescription>
              </Alert>
            )}
            
            {loading.qr ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : qrData.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">
                    {qrData.length - 1} QR codes found 
                  </Badge>
                </div>
                
                <div className="hidden md:block overflow-x-auto">
                  {renderDesktopTable(qrData, true)}
                </div>
                
                <div className="md:hidden">
                  <ScrollArea className="h-96">
                    {qrData.slice(1).map((row, index) => ( 
                      <Card key={index} className="mb-3">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="font-medium text-sm">{qrData[0]?.[0] || 'QR Code'}:</span>
                              <span className="text-sm font-mono truncate ml-2">{row[0] || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-sm">{qrData[0]?.[1] || 'Description'}:</span>
                              <span className="text-sm truncate ml-2">{row[1] || '-'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <QrCode className="size-12 mx-auto mb-4 opacity-50" />
                <p>No QR code data available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
