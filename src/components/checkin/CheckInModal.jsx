"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UserCheck, Calendar, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { checkInAPI } from "@/lib/api/checkin"
import { toast } from "sonner"

export function CheckInModal({ student, open, onClose, onConfirm }) {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [checkInState, setCheckInState] = useState("idle") // "idle", "processing", "completed", "error"
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [error, setError] = useState("")
  const eventSourceRef = useRef(null)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (!open || !student) return
    setCurrentTime(new Date())
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [open, student])

  useEffect(() => {
    if (
      open &&
      student &&
      (!student.qrCode || student.qrCode.trim() === "")
    ) {
      console.warn(
        `[CheckInModal] Student ${student.firstName} ${student.lastName} does not have a QR code linked.`
      )
    }
  }, [open, student])

  useEffect(() => {
    if (!open) {
      setCheckInState("idle")
      setProgress(0)
      setStatusMessage("")
      setQrCodeUrl("")
      setError("")
      hasStartedRef.current = false
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [open])

  if (!open || !student) return null

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const missingQRCode = !student.qrCode || student.qrCode.trim() === "";

  const handleConfirmCheckIn = async () => {
    if (missingQRCode || checkInState === "processing" || hasStartedRef.current) return;

    hasStartedRef.current = true;
    try {
      console.log(`[CheckInModal] Starting check-in for ${student.firstName} ${student.lastName}`);
      
      setCheckInState("processing")
      setProgress(0)
      setStatusMessage("Initializing check-in process...")
      setError("")

      const jobId = await checkInAPI.startCheckIn(student.studentId);
      
      setProgress(10)
      setStatusMessage("Starting check-in process...")

      eventSourceRef.current = checkInAPI.createStreamConnection(
        jobId,
        (data) => {
          console.log("[CheckInModal] Stream update:", data);
          const newProgress = data.progress || 50;
          setProgress(newProgress);
          if (data.message) {
            setStatusMessage(data.message);
          } else {
            setStatusMessage("Processing check-in...");
          }
          if (data.qrCode) {
            setQrCodeUrl(data.qrCode)
          }
        },
        (error) => {
          console.error("[CheckInModal] Stream error:", error);
          setCheckInState("error")
          setError(error)
          setProgress(100)
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
          }
          toast.error("Check-in failed", {
            description: error
          })
        },
        (data) => {
          console.log("[CheckInModal] Check-in complete:", data);
          setCheckInState("completed")
          setProgress(100)
          setStatusMessage("Check-in completed successfully!")
          if (data.qrCode) {
            setQrCodeUrl(data.qrCode)
          }
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
          }
          toast.success(`${student.firstName} ${student.lastName} Checked In!`, {
            description: "Check-in completed successfully"
          })
        }
      );
    } catch (error) {
      console.error("[CheckInModal] Check-in error:", error);
      setCheckInState("error")
      setError(error.message || "Failed to start check-in")
      setProgress(100)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      toast.error("Check-in failed", {
        description: error.message || "Failed to start check-in"
      })
    }
  };

  const handleClose = () => {
    if (checkInState === "processing") {
      return;
    }
    onClose();
  };

  const isProcessing = checkInState === "processing";
  const isCompleted = checkInState === "completed";
  const hasError = checkInState === "error";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-3 md:p-6 rounded-xl w-full max-w-[98vw] md:max-w-3xl lg:max-w-4xl">
        <DialogHeader className="text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
            {isProcessing && <Loader2 className="size-12 md:size-16 text-primary animate-spin" />}
            {isCompleted && <CheckCircle2 className="size-12 md:size-16 text-green-600" />}
            {hasError && <AlertCircle className="size-12 md:size-16 text-red-600" />}
            {!isProcessing && !isCompleted && !hasError && <UserCheck className="size-12 md:size-16 text-primary" />}
          </div>
          <DialogTitle className="text-3xl md:text-4xl font-bold">
            {isCompleted ? "Check-In Complete!" : isProcessing ? "Checking In..." : "Confirm Check-In"}
          </DialogTitle>
          <DialogDescription className="text-xl md:text-2xl font-semibold">
            {isCompleted 
              ? `${student.firstName} ${student.lastName} has been successfully checked in`
              : isProcessing 
                ? statusMessage
                : "Please confirm you want to check in this student"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-10 py-4">
          <div className="text-center space-y-4">
            <h3 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
              {student.firstName} {student.lastName}
            </h3>
            {student.lastAttendance && (
              <div className="text-xl md:text-2xl text-muted-foreground font-semibold">
                <span className="font-bold">Last Attendance:</span> {student.lastAttendance}
              </div>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-5">
              <Progress value={progress} className="h-5" />
              <div className="text-center text-lg md:text-xl text-muted-foreground">
                {progress}% - {statusMessage}
              </div>
            </div>
          )}

          {(qrCodeUrl || (!missingQRCode && student.qrCode)) && (isCompleted || isProcessing) && (
            <div className="text-center space-y-5">
              <div className="font-semibold text-2xl md:text-3xl">Session QR Code</div>
              <div className="flex justify-center">
                <img 
                  src={qrCodeUrl || student.qrCode} 
                  alt="Session QR Code" 
                  className="max-w-[320px] max-h-[320px] md:max-w-[400px] md:max-h-[400px] rounded-2xl border-2 shadow-2xl"
                />
              </div>
              <p className="text-lg md:text-xl text-muted-foreground">Scan to start your session</p>
            </div>
          )}

          {!isProcessing && !isCompleted && (
            <div className="bg-muted rounded-xl p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-center gap-3 text-2xl md:text-3xl font-bold">
                <Calendar className="size-7 md:size-8 text-primary" />
                Check-in Date & Time
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-2xl md:text-3xl font-bold">
                  {formatDate(currentTime)}
                </div>
                <div className="text-3xl md:text-4xl font-mono font-extrabold text-primary tracking-widest">
                  {formatTime(currentTime)}
                </div>
              </div>
            </div>
          )}

          {missingQRCode && !isProcessing && !isCompleted && (
            <div className="flex flex-col items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-lg p-4 mt-4 md:p-4 md:mt-4 max-w-xs md:max-w-md mx-auto">
              <AlertCircle className="size-8 md:size-10 text-red-500" />
              <div className="text-xl md:text-2xl font-bold text-red-700">
                No QR Code Linked
              </div>
              <div className="text-lg md:text-xl text-red-700 text-center">
                This student does not have a QR code linked.<br />
                Please ask the center director for help.
              </div>
            </div>
          )}

          {hasError && (
            <div className="flex flex-col items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <AlertCircle className="size-8 md:size-10 text-red-500" />
              <div className="text-xl md:text-2xl font-bold text-red-700">
                Check-in Failed
              </div>
              <div className="text-lg md:text-xl text-red-700 text-center">
                {error}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-4 sm:gap-4 mt-2">
          {!isProcessing && !isCompleted && (
            <Button 
              onClick={handleConfirmCheckIn}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white h-20 text-2xl md:text-3xl font-bold rounded-xl"
              size="lg"
              disabled={missingQRCode}
            >
              <UserCheck className="size-7 md:size-8 mr-3" />
              Check In
            </Button>
          )}
          
          <Button 
            variant={isCompleted ? "default" : "outline"}
            onClick={handleClose}
            className={`flex-1 h-20 text-2xl md:text-3xl font-bold rounded-xl ${
              isCompleted ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""
            }`}
            size="lg"
            disabled={isProcessing}
          >
            {isCompleted ? "Done" : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
