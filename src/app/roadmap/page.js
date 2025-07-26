import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SignInButton } from "@/components/auth/SignInButton";
import { Construction, QrCode, Users, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RoadmapPage() {
  const features = [
    { name: "QR Code Pulling", status: "in-progress", progress: 60 },
    { name: "Student Database Integration", status: "in-progress", progress: 75 },
    { name: "Check-in System", status: "completed", progress: 100 },
    { name: "Admin Dashboard", status: "planned", progress: 20 },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "default";
      case "in-progress": return "secondary";
      case "planned": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <header className="w-full px-2 sm:px-4 py-4 sm:py-6">
        <div className="max-w-full sm:container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
            <QrCode className="size-8 text-primary" />
            <h1 className="text-2xl font-bold">RadiusCheckIn</h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Link href="/">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base py-3 rounded-lg">
                Home
              </Button>
            </Link>
            <SignInButton />
          </div>
        </div>
      </header>

      <main className="w-full px-2 sm:px-4 py-8 sm:py-12">
        <div className="max-w-full sm:container mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Construction className="size-16 text-orange-500" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Development Roadmap
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Track the progress of RadiusCheckIn development
            </p>
          </div>

          <Alert>
            <Construction className="size-4" />
            <AlertDescription>
              This application is currently under active development. Features and functionality may change.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-5" />
                  Development Progress
                </CardTitle>
                <CardDescription>
                  Current status of features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{feature.name}</span>
                      <Badge variant={getStatusColor(feature.status)}>
                        {feature.status === "completed" && <CheckCircle2 className="size-3 mr-1" />}
                        {feature.status.replace("-", " ")}
                      </Badge>
                    </div>
                    <Progress value={feature.progress} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  What's Coming
                </CardTitle>
                <CardDescription>
                  Features i'm working on
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <QrCode className="size-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Displaying Student Check In</h4>
                      <p className="text-sm text-muted-foreground">
                        Fast and Simple to use check in system for students, divided by center.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="size-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Student Management</h4>
                      <p className="text-sm text-muted-foreground">
                        Managing the QR code associated for every enrolled hybrid student.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Built for Lossing Mathnasium Learning Centers</p>
            <p>Questions? Contact vunsh.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
