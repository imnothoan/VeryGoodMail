"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Camera, Loader2, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useI18n } from "@/contexts/i18n-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Footer } from "@/components/footer"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"

// Maximum avatar size: 2MB
const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const AVATARS_BUCKET = 'avatars'

/**
 * Extract storage path from a Supabase public URL
 * @param publicUrl - Full public URL from Supabase
 * @param bucket - Bucket name to extract path from
 * @returns Path within the bucket, or null if not found
 */
function extractStoragePath(publicUrl: string | null, bucket: string): string | null {
    if (!publicUrl) return null
    
    try {
        const url = new URL(publicUrl)
        // Supabase storage URLs follow pattern: /storage/v1/object/public/{bucket}/{path}
        const pathParts = url.pathname.split(`/${bucket}/`)
        if (pathParts.length > 1) {
            return decodeURIComponent(pathParts[1])
        }
    } catch {
        // URL parsing failed, try simple string split as fallback
        const marker = `/${bucket}/`
        const index = publicUrl.indexOf(marker)
        if (index !== -1) {
            return publicUrl.substring(index + marker.length)
        }
    }
    return null
}

export default function AccountPage() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const { t, language } = useI18n()
    const { toast } = useToast()
    
    const [displayName, setDisplayName] = React.useState('')
    const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
    const [isSaving, setIsSaving] = React.useState(false)
    const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    
    // Load user profile data
    React.useEffect(() => {
        if (user) {
            setDisplayName(user.user_metadata?.full_name || '')
            setAvatarUrl(user.user_metadata?.avatar_url || null)
        }
    }, [user])
    
    // Redirect if not authenticated
    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login')
        }
    }, [user, authLoading, router])
    
    /**
     * Delete avatar from storage
     * @param url - Public URL of the avatar to delete
     */
    const deleteAvatarFromStorage = async (url: string | null): Promise<void> => {
        const path = extractStoragePath(url, AVATARS_BUCKET)
        if (path) {
            try {
                await supabase.storage.from(AVATARS_BUCKET).remove([path])
            } catch (error) {
                console.error('Error deleting avatar:', error)
            }
        }
    }
    
    const handleSaveProfile = async () => {
        if (!user) return
        
        setIsSaving(true)
        
        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: displayName,
                    avatar_url: avatarUrl,
                }
            })
            
            if (error) throw error
            
            // Also update profile table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: displayName,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)
            
            if (profileError) {
                console.error('Profile update error:', profileError)
            }
            
            toast({
                title: t.settings.changesSaved,
                description: language === 'vi' 
                    ? 'Hồ sơ của bạn đã được cập nhật' 
                    : 'Your profile has been updated',
            })
        } catch (error) {
            console.error('Error saving profile:', error)
            toast({
                title: t.common.error,
                description: language === 'vi' 
                    ? 'Không thể lưu thay đổi. Vui lòng thử lại.' 
                    : 'Failed to save changes. Please try again.',
                variant: 'destructive',
            })
        } finally {
            setIsSaving(false)
        }
    }
    
    const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file || !user) return
        
        // Validate file type
        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            toast({
                title: t.common.error,
                description: language === 'vi'
                    ? 'Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)'
                    : 'Only image files are allowed (JPEG, PNG, GIF, WebP)',
                variant: 'destructive',
            })
            return
        }
        
        // Validate file size
        if (file.size > MAX_AVATAR_SIZE) {
            toast({
                title: t.common.error,
                description: language === 'vi'
                    ? 'Kích thước ảnh tối đa là 2MB'
                    : 'Maximum avatar size is 2MB',
                variant: 'destructive',
            })
            return
        }
        
        setIsUploadingAvatar(true)
        
        try {
            // Generate unique filename
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`
            
            // Delete old avatar if exists (use helper function)
            await deleteAvatarFromStorage(avatarUrl)
            
            // Upload new avatar
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                })
            
            if (error) throw error
            
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(data.path)
            
            setAvatarUrl(urlData.publicUrl)
            
            toast({
                title: t.common.success,
                description: language === 'vi'
                    ? 'Đã tải ảnh lên thành công'
                    : 'Avatar uploaded successfully',
            })
        } catch (error) {
            console.error('Avatar upload error:', error)
            toast({
                title: t.common.error,
                description: language === 'vi'
                    ? 'Không thể tải ảnh lên. Vui lòng thử lại.'
                    : 'Failed to upload avatar. Please try again.',
                variant: 'destructive',
            })
        } finally {
            setIsUploadingAvatar(false)
            // Clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }
    
    const handleRemoveAvatar = async () => {
        if (!user || !avatarUrl) return
        
        setIsUploadingAvatar(true)
        
        try {
            // Delete avatar from storage (use helper function)
            await deleteAvatarFromStorage(avatarUrl)
            
            setAvatarUrl(null)
            
            toast({
                title: t.common.success,
                description: language === 'vi'
                    ? 'Đã xóa ảnh đại diện'
                    : 'Avatar removed',
            })
        } catch (error) {
            console.error('Remove avatar error:', error)
        } finally {
            setIsUploadingAvatar(false)
        }
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
    
    if (!user) {
        return null
    }
    
    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="flex items-center justify-between border-b px-4 py-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-xl font-bold">VeryGoodMail</h1>
                </div>
                <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <ModeToggle />
                </div>
            </header>
            
            {/* Main Content */}
            <main className="flex-1 container max-w-2xl py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t.settings.profileSettings}</CardTitle>
                        <CardDescription>
                            {language === 'vi'
                                ? 'Quản lý thông tin hồ sơ và cài đặt tài khoản của bạn'
                                : 'Manage your profile information and account settings'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Avatar Section */}
                        <div className="space-y-3">
                            <Label>{t.settings.avatar}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t.settings.avatarHelp}
                            </p>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                                    <AvatarFallback className="text-2xl">
                                        {displayName ? displayName.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        className="hidden"
                                        onChange={handleAvatarSelect}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingAvatar}
                                    >
                                        {isUploadingAvatar ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Camera className="mr-2 h-4 w-4" />
                                        )}
                                        {t.settings.uploadAvatar}
                                    </Button>
                                    {avatarUrl && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleRemoveAvatar}
                                            disabled={isUploadingAvatar}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            {t.settings.removeAvatar}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Display Name */}
                        <div className="space-y-2">
                            <Label htmlFor="displayName">{t.settings.displayName}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t.settings.displayNameHelp}
                            </p>
                            <Input
                                id="displayName"
                                value={displayName ?? ''}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={language === 'vi' ? 'Nhập tên của bạn' : 'Enter your name'}
                            />
                        </div>
                        
                        {/* Email (read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="email">{t.auth.email}</Label>
                            <Input
                                id="email"
                                value={user.email || ''}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                {language === 'vi'
                                    ? 'Email không thể thay đổi'
                                    : 'Email cannot be changed'}
                            </p>
                        </div>
                        
                        {/* Save Button */}
                        <Button
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="w-full sm:w-auto"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t.settings.savingChanges}
                                </>
                            ) : (
                                t.common.save
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </main>
            
            {/* Footer */}
            <Footer />
        </div>
    )
}
