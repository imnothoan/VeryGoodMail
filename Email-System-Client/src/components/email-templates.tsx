"use client"

import * as React from "react"
import { FileText, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/contexts/i18n-context"

export interface EmailTemplate {
    id: string
    name: string
    nameVi: string
    subject: string
    subjectVi: string
    body: string
    bodyVi: string
    category: 'professional' | 'personal' | 'followup'
}

// Pre-built email templates for quick composition
export const EMAIL_TEMPLATES: EmailTemplate[] = [
    // Professional templates
    {
        id: 'meeting-request',
        name: 'Meeting Request',
        nameVi: 'Yêu cầu họp',
        category: 'professional',
        subject: 'Meeting Request: [Topic]',
        subjectVi: 'Yêu cầu họp: [Chủ đề]',
        body: `Dear [Name],

I hope this email finds you well.

I would like to schedule a meeting to discuss [topic]. Would you be available on [date] at [time]?

Please let me know if this works for you or suggest an alternative time that suits your schedule.

Best regards,
[Your Name]`,
        bodyVi: `Kính gửi [Tên],

Tôi hy vọng bạn khỏe mạnh.

Tôi muốn sắp xếp một cuộc họp để thảo luận về [chủ đề]. Bạn có thể tham gia vào ngày [ngày] lúc [giờ] không?

Vui lòng cho tôi biết nếu thời gian này phù hợp với bạn hoặc đề xuất thời gian khác phù hợp với lịch trình của bạn.

Trân trọng,
[Tên của bạn]`,
    },
    {
        id: 'thank-you',
        name: 'Thank You',
        nameVi: 'Cảm ơn',
        category: 'professional',
        subject: 'Thank You for [Reason]',
        subjectVi: 'Cảm ơn về [Lý do]',
        body: `Dear [Name],

I wanted to take a moment to thank you for [reason].

Your [support/help/time] was greatly appreciated and made a significant difference.

Thank you once again.

Best regards,
[Your Name]`,
        bodyVi: `Kính gửi [Tên],

Tôi muốn dành một chút thời gian để cảm ơn bạn về [lý do].

Sự [hỗ trợ/giúp đỡ/thời gian] của bạn đã được đánh giá cao và tạo nên sự khác biệt đáng kể.

Một lần nữa xin cảm ơn bạn.

Trân trọng,
[Tên của bạn]`,
    },
    {
        id: 'introduction',
        name: 'Self Introduction',
        nameVi: 'Tự giới thiệu',
        category: 'professional',
        subject: 'Introduction: [Your Name] from [Company]',
        subjectVi: 'Giới thiệu: [Tên của bạn] từ [Công ty]',
        body: `Dear [Name],

I hope this email finds you well.

My name is [Your Name], and I am [your position] at [Company]. I am reaching out because [reason for contact].

I would love the opportunity to [purpose of connection].

Please let me know if you would be open to [suggested next step].

Looking forward to hearing from you.

Best regards,
[Your Name]
[Your Position]
[Company]`,
        bodyVi: `Kính gửi [Tên],

Tôi hy vọng bạn khỏe mạnh.

Tên tôi là [Tên của bạn], và tôi là [chức vụ] tại [Công ty]. Tôi liên hệ vì [lý do liên hệ].

Tôi rất mong có cơ hội [mục đích kết nối].

Vui lòng cho tôi biết nếu bạn sẵn lòng [bước tiếp theo đề xuất].

Mong nhận được phản hồi từ bạn.

Trân trọng,
[Tên của bạn]
[Chức vụ]
[Công ty]`,
    },
    // Follow-up templates
    {
        id: 'follow-up-meeting',
        name: 'Follow Up After Meeting',
        nameVi: 'Theo dõi sau cuộc họp',
        category: 'followup',
        subject: 'Follow Up: Our Meeting on [Date]',
        subjectVi: 'Theo dõi: Cuộc họp ngày [Ngày]',
        body: `Dear [Name],

Thank you for taking the time to meet with me on [date].

I enjoyed our discussion about [topic], and I wanted to follow up on [specific point].

As discussed, I will [action item]. Please let me know if you need anything else from my end.

Looking forward to our continued collaboration.

Best regards,
[Your Name]`,
        bodyVi: `Kính gửi [Tên],

Cảm ơn bạn đã dành thời gian gặp gỡ tôi vào ngày [ngày].

Tôi rất vui được thảo luận về [chủ đề], và tôi muốn theo dõi về [điểm cụ thể].

Như đã thảo luận, tôi sẽ [công việc cần làm]. Vui lòng cho tôi biết nếu bạn cần thêm gì từ phía tôi.

Mong được tiếp tục hợp tác.

Trân trọng,
[Tên của bạn]`,
    },
    {
        id: 'follow-up-no-response',
        name: 'Follow Up (No Response)',
        nameVi: 'Theo dõi (Chưa phản hồi)',
        category: 'followup',
        subject: 'Following Up: [Original Subject]',
        subjectVi: 'Theo dõi: [Chủ đề ban đầu]',
        body: `Dear [Name],

I hope this email finds you well.

I wanted to follow up on my previous email regarding [topic]. I understand you're busy, but I would appreciate your response when you have a moment.

Please let me know if you need any additional information from me.

Thank you for your time.

Best regards,
[Your Name]`,
        bodyVi: `Kính gửi [Tên],

Tôi hy vọng bạn khỏe mạnh.

Tôi muốn theo dõi email trước đó của tôi về [chủ đề]. Tôi hiểu bạn đang bận, nhưng tôi sẽ rất biết ơn nếu bạn phản hồi khi có thời gian.

Vui lòng cho tôi biết nếu bạn cần thêm thông tin từ tôi.

Cảm ơn thời gian của bạn.

Trân trọng,
[Tên của bạn]`,
    },
    // Personal templates
    {
        id: 'birthday-wishes',
        name: 'Birthday Wishes',
        nameVi: 'Chúc mừng sinh nhật',
        category: 'personal',
        subject: 'Happy Birthday! 🎂',
        subjectVi: 'Chúc mừng sinh nhật! 🎂',
        body: `Dear [Name],

Wishing you a very happy birthday! 🎉

May this special day bring you happiness, joy, and all the wonderful things you deserve.

Have an amazing celebration!

Warm wishes,
[Your Name]`,
        bodyVi: `Kính gửi [Tên],

Chúc bạn một ngày sinh nhật thật vui vẻ! 🎉

Mong rằng ngày đặc biệt này sẽ mang đến cho bạn hạnh phúc, niềm vui và tất cả những điều tuyệt vời mà bạn xứng đáng có được.

Chúc bạn có một ngày sinh nhật thật tuyệt vời!

Thân ái,
[Tên của bạn]`,
    },
    {
        id: 'congratulations',
        name: 'Congratulations',
        nameVi: 'Chúc mừng',
        category: 'personal',
        subject: 'Congratulations! 🎉',
        subjectVi: 'Chúc mừng! 🎉',
        body: `Dear [Name],

Congratulations on [achievement]! 🎊

This is wonderful news, and you truly deserve this success. Your hard work and dedication have paid off.

Wishing you continued success in all your future endeavors.

Best wishes,
[Your Name]`,
        bodyVi: `Kính gửi [Tên],

Chúc mừng bạn về [thành tựu]! 🎊

Đây là tin tuyệt vời, và bạn thực sự xứng đáng với thành công này. Sự chăm chỉ và cống hiến của bạn đã được đền đáp.

Chúc bạn tiếp tục thành công trong mọi nỗ lực tương lai.

Thân ái,
[Tên của bạn]`,
    },
]

interface EmailTemplatesProps {
    onSelectTemplate: (template: EmailTemplate) => void
    disabled?: boolean
}

export function EmailTemplates({ onSelectTemplate, disabled }: EmailTemplatesProps) {
    const { language } = useI18n()
    const [selectedId, setSelectedId] = React.useState<string | null>(null)

    const handleSelect = (template: EmailTemplate) => {
        setSelectedId(template.id)
        onSelectTemplate(template)
        // Reset selection after a short delay for visual feedback
        setTimeout(() => setSelectedId(null), 1000)
    }

    const groupedTemplates = {
        professional: EMAIL_TEMPLATES.filter(t => t.category === 'professional'),
        followup: EMAIL_TEMPLATES.filter(t => t.category === 'followup'),
        personal: EMAIL_TEMPLATES.filter(t => t.category === 'personal'),
    }

    const categoryNames = {
        professional: language === 'vi' ? 'Chuyên nghiệp' : 'Professional',
        followup: language === 'vi' ? 'Theo dõi' : 'Follow Up',
        personal: language === 'vi' ? 'Cá nhân' : 'Personal',
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={disabled}
                    className="gap-1"
                >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">
                        {language === 'vi' ? 'Mẫu' : 'Templates'}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
                <DropdownMenuLabel>
                    {language === 'vi' ? 'Chọn mẫu email' : 'Choose a template'}
                </DropdownMenuLabel>
                
                {Object.entries(groupedTemplates).map(([category, templates]) => (
                    <React.Fragment key={category}>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                            {categoryNames[category as keyof typeof categoryNames]}
                        </DropdownMenuLabel>
                        {templates.map((template) => (
                            <DropdownMenuItem
                                key={template.id}
                                onClick={() => handleSelect(template)}
                                className="flex items-center justify-between cursor-pointer"
                            >
                                <span>
                                    {language === 'vi' ? template.nameVi : template.name}
                                </span>
                                {selectedId === template.id && (
                                    <Check className="h-4 w-4 text-green-500" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </React.Fragment>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
