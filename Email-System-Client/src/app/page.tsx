"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Mail } from "@/components/mail"
import { useEmails } from "@/hooks/use-emails"
import { useSocket } from "@/hooks/use-socket"
import { useAuth } from "@/contexts/auth-context"
import { useI18n } from "@/contexts/i18n-context"
import { Footer } from "@/components/footer"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"
import { Button } from "@/components/ui/button"
import { LogOut, User, Wifi, WifiOff, RefreshCw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Folder } from "@/services/email-service"

export default function Page() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const { t, language } = useI18n()
  const { isConnected, connectionError, reconnect } = useSocket()
  const layout = [20, 32, 48]
  const collapsed = false

  // Email management hook
  const {
    emails,
    selectedEmail,
    loading: emailsLoading,
    error: emailsError,
    folder,
    unreadCounts,
    setFolder,
    selectEmail,
    refreshEmails,
    markAsRead,
    markAsUnread,
    toggleStar,
    moveToTrash,
    moveToSpam,
    searchEmails,
  } = useEmails({ initialFolder: 'inbox' })

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleFolderChange = (newFolder: Folder) => {
    setFolder(newFolder)
  }

  // Show loading state
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
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
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">VeryGoodMail</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isConnected 
                  ? (language === 'vi' ? 'Đã kết nối' : 'Connected')
                  : (language === 'vi' ? 'Mất kết nối' : 'Disconnected')
                }
                {connectionError && ` - ${connectionError}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Reconnect button when disconnected */}
          {!isConnected && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={reconnect}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {language === 'vi' ? 'Kết nối lại' : 'Reconnect'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={refreshEmails}
                  disabled={emailsLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${emailsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {language === 'vi' ? 'Làm mới' : 'Refresh'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <KeyboardShortcuts />
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
              <DropdownMenuItem onClick={() => router.push('/account')}>
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

      {/* Error banner */}
      {emailsError && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm text-center">
          {emailsError}
          <Button variant="link" onClick={refreshEmails} className="ml-2">
            {t.common.retry}
          </Button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Mail
          mails={emails}
          selectedMail={selectedEmail}
          folder={folder}
          unreadCounts={unreadCounts}
          loading={emailsLoading}
          onFolderChange={handleFolderChange}
          onSelectMail={selectEmail}
          onMarkAsRead={markAsRead}
          onMarkAsUnread={markAsUnread}
          onToggleStar={toggleStar}
          onMoveToTrash={moveToTrash}
          onMoveToSpam={moveToSpam}
          onSearch={searchEmails}
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
