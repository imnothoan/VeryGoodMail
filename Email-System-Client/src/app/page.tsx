"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Mail } from "@/components/mail"
import { Email } from "@/types"
import { useSocket } from "@/hooks/use-socket"
import { useAuth } from "@/contexts/auth-context"
import { useI18n } from "@/contexts/i18n-context"
import { Footer } from "@/components/footer"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function Page() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const { t } = useI18n()
  const layout = [20, 32, 48]
  const collapsed = false
  const { socket, isConnected } = useSocket()

  const [mails, setMails] = React.useState<Email[]>([
    {
      id: "1",
      thread_id: "t1",
      user_id: "u1",
      sender_name: "William Smith",
      sender_email: "williamsmith@example.com",
      recipient_emails: ["me@example.com"],
      subject: "Meeting Tomorrow",
      snippet: "Hi, let's meet tomorrow to discuss the project. I've attached the agenda for your review.",
      body_text: "Hi,\n\nLet's meet tomorrow to discuss the project. I've attached the agenda for your review.\n\nBest,\nWilliam",
      date: new Date().toISOString(),
      is_read: false,
      is_starred: true,
      is_draft: false,
      labels: [{ id: "l1", name: "work", type: "user", color: "#000" }],
    },
    {
      id: "2",
      thread_id: "t2",
      user_id: "u1",
      sender_name: "Alice Smith",
      sender_email: "alicesmith@example.com",
      recipient_emails: ["me@example.com"],
      subject: "Re: Project Update",
      snippet: "Thank you for the project update. It looks great! I have a few questions about the timeline.",
      body_text: "Thank you for the project update. It looks great!\n\nI have a few questions about the timeline. Can we hop on a quick call?\n\nThanks,\nAlice",
      date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      is_read: true,
      is_starred: false,
      is_draft: false,
      labels: [{ id: "l2", name: "personal", type: "user", color: "#000" }],
    },
    {
      id: "3",
      thread_id: "t3",
      user_id: "u1",
      sender_name: "Bob Johnson",
      sender_email: "bobjohnson@example.com",
      recipient_emails: ["me@example.com"],
      subject: "Weekend Plans",
      snippet: "Hey, are you free this weekend? We are planning a hiking trip.",
      body_text: "Hey,\n\nAre you free this weekend? We are planning a hiking trip to the mountains.\n\nLet me know if you want to join!\n\nBob",
      date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      is_read: true,
      is_starred: false,
      is_draft: false,
      labels: [],
    }
  ])

  React.useEffect(() => {
    if (!socket) return

    socket.on("new-email", (newEmail: Email) => {
      setMails((prev) => [newEmail, ...prev])
    })

    return () => {
      socket.off("new-email")
    }
  }, [socket])

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">VeryGoodMail</h1>
          <span className="hidden text-sm text-muted-foreground">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
                  <AvatarFallback>
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>{t.settings.account}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t.auth.signOut}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Mail
          mails={mails}
          defaultLayout={layout}
          defaultCollapsed={collapsed}
          navCollapsedSize={4}
        />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
