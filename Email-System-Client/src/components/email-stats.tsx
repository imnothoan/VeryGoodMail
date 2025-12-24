"use client"

import * as React from "react"
import { BarChart3, Mail, Inbox, Send, AlertTriangle, Star, TrendingUp, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/contexts/i18n-context"
import { Folder } from "@/services/email-service"

interface EmailStatsProps {
    unreadCounts: Record<Folder, number>
}

interface StatCard {
    title: string
    titleVi: string
    value: number
    icon: React.ReactNode
    description?: string
    descriptionVi?: string
    color: string
}

export function EmailStats({ unreadCounts }: EmailStatsProps) {
    const { language } = useI18n()
    const [open, setOpen] = React.useState(false)

    // Calculate stats
    const totalUnread = unreadCounts.inbox + unreadCounts.social + unreadCounts.promotions + unreadCounts.updates
    const spamCount = unreadCounts.spam
    const starredCount = unreadCounts.starred
    const draftsCount = unreadCounts.drafts
    const importantCount = unreadCounts.important

    // Productivity score (higher is better - fewer unread emails)
    const calculateProductivityScore = () => {
        if (totalUnread === 0) return 100
        if (totalUnread < 5) return 90
        if (totalUnread < 10) return 80
        if (totalUnread < 25) return 60
        if (totalUnread < 50) return 40
        return 20
    }

    const productivityScore = calculateProductivityScore()

    const getProductivityLabel = () => {
        if (productivityScore >= 90) return language === 'vi' ? 'Xuất sắc!' : 'Excellent!'
        if (productivityScore >= 70) return language === 'vi' ? 'Tốt' : 'Good'
        if (productivityScore >= 50) return language === 'vi' ? 'Trung bình' : 'Average'
        return language === 'vi' ? 'Cần cải thiện' : 'Needs improvement'
    }

    const getProductivityColor = () => {
        if (productivityScore >= 90) return 'text-green-500'
        if (productivityScore >= 70) return 'text-blue-500'
        if (productivityScore >= 50) return 'text-yellow-500'
        return 'text-red-500'
    }

    const stats: StatCard[] = [
        {
            title: 'Inbox',
            titleVi: 'Hộp thư đến',
            value: unreadCounts.inbox,
            icon: <Inbox className="h-4 w-4" />,
            description: 'unread emails',
            descriptionVi: 'email chưa đọc',
            color: 'text-blue-500',
        },
        {
            title: 'Starred',
            titleVi: 'Đánh dấu sao',
            value: starredCount,
            icon: <Star className="h-4 w-4" />,
            description: 'starred emails',
            descriptionVi: 'email gắn sao',
            color: 'text-yellow-500',
        },
        {
            title: 'Important',
            titleVi: 'Quan trọng',
            value: importantCount,
            icon: <AlertTriangle className="h-4 w-4" />,
            description: 'important emails',
            descriptionVi: 'email quan trọng',
            color: 'text-orange-500',
        },
        {
            title: 'Drafts',
            titleVi: 'Bản nháp',
            value: draftsCount,
            icon: <Mail className="h-4 w-4" />,
            description: 'draft emails',
            descriptionVi: 'bản nháp',
            color: 'text-gray-500',
        },
        {
            title: 'Spam',
            titleVi: 'Thư rác',
            value: spamCount,
            icon: <AlertTriangle className="h-4 w-4" />,
            description: 'spam emails',
            descriptionVi: 'thư rác',
            color: 'text-red-500',
        },
        {
            title: 'Social',
            titleVi: 'Xã hội',
            value: unreadCounts.social,
            icon: <Mail className="h-4 w-4" />,
            description: 'social emails',
            descriptionVi: 'email xã hội',
            color: 'text-purple-500',
        },
    ]

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <BarChart3 className="h-4 w-4" />
                    {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                            {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                    )}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        {language === 'vi' ? 'Thống kê Email' : 'Email Statistics'}
                    </DialogTitle>
                    <DialogDescription>
                        {language === 'vi'
                            ? 'Tổng quan về hộp thư của bạn'
                            : 'Overview of your mailbox'}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Productivity Score */}
                    <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                {language === 'vi' ? 'Điểm năng suất' : 'Productivity Score'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className={`text-4xl font-bold ${getProductivityColor()}`}>
                                        {productivityScore}%
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {getProductivityLabel()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">
                                        {totalUnread} {language === 'vi' ? 'email chưa đọc' : 'unread emails'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {language === 'vi' 
                                            ? 'Mục tiêu: Giữ inbox sạch!'
                                            : 'Goal: Keep inbox clean!'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ${
                                        productivityScore >= 90 ? 'bg-green-500' :
                                        productivityScore >= 70 ? 'bg-blue-500' :
                                        productivityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${productivityScore}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {stats.map((stat) => (
                            <Card key={stat.title} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={stat.color}>{stat.icon}</span>
                                        <span className="text-2xl font-bold">{stat.value}</span>
                                    </div>
                                    <p className="text-sm font-medium">
                                        {language === 'vi' ? stat.titleVi : stat.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {language === 'vi' ? stat.descriptionVi : stat.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Tips Section */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {language === 'vi' ? 'Mẹo hiệu quả' : 'Productivity Tips'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="text-sm text-muted-foreground space-y-2">
                                <li className="flex items-start gap-2">
                                    <span>•</span>
                                    <span>
                                        {language === 'vi'
                                            ? 'Xử lý email theo nhóm - Đọc và trả lời nhiều email cùng lúc'
                                            : 'Batch process emails - Read and reply to multiple emails at once'}
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>•</span>
                                    <span>
                                        {language === 'vi'
                                            ? 'Dùng phím tắt (nhấn ?) để điều hướng nhanh hơn'
                                            : 'Use keyboard shortcuts (press ?) to navigate faster'}
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>•</span>
                                    <span>
                                        {language === 'vi'
                                            ? 'Đánh dấu sao cho email quan trọng để dễ tìm sau'
                                            : 'Star important emails for easy reference later'}
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>•</span>
                                    <span>
                                        {language === 'vi'
                                            ? 'Dùng mẫu email để tiết kiệm thời gian soạn thư'
                                            : 'Use email templates to save time when composing'}
                                    </span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    )
}
