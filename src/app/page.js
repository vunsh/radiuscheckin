import { CheckInSystem } from "@/components/checkin/CheckInSystem";
import { SignInButton } from "@/components/auth/SignInButton";
import { QrCode, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <header className="w-full px-2 sm:px-4 py-4 sm:py-6">
        <div className="max-w-full sm:container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
            <QrCode className="size-8 text-primary" />
            <h1 className="text-2xl font-bold">RadiusCheckIn</h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Link href="/roadmap" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base py-3 rounded-lg">
                Roadmap
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
              <MapPin className="size-16 text-primary" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Student Check-In
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Select your center to begin the check-in process
            </p>
          </div>

          <CheckInSystem />
        </div>
      </main>
    </div>
  );
}
