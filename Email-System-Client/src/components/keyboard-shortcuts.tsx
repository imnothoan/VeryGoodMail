"use client"

import * as React from "react"
import { Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/contexts/i18n-context"

interface ShortcutItem {
    keys: string[]
    description: string
    descriptionVi: string
}

const KEYBOARD_SHORTCUTS: { category: string; categoryVi: string; shortcuts: ShortcutItem[] }[] = [
    {
        category: 'Navigation',
        categoryVi: 'Điều hướng',
        shortcuts: [
            { keys: ['j'], description: 'Next email', descriptionVi: 'Email kế tiếp' },
            { keys: ['k'], description: 'Previous email', descriptionVi: 'Email trước đó' },
            { keys: ['Enter'], description: 'Open email', descriptionVi: 'Mở email' },
            { keys: ['Esc'], description: 'Close/Cancel', descriptionVi: 'Đóng/Hủy' },
        ],
    },
    {
        category: 'Actions',
        categoryVi: 'Hành động',
        shortcuts: [
            { keys: ['c'], description: 'Compose new email', descriptionVi: 'Soạn email mới' },
            { keys: ['r'], description: 'Reply', descriptionVi: 'Trả lời' },
            { keys: ['s'], description: 'Toggle star', descriptionVi: 'Đánh dấu sao' },
            { keys: ['e'], description: 'Archive', descriptionVi: 'Lưu trữ' },
            { keys: ['#'], description: 'Delete/Trash', descriptionVi: 'Xóa' },
        ],
    },
    {
        category: 'Reading',
        categoryVi: 'Đọc mail',
        shortcuts: [
            { keys: ['Shift', 'i'], description: 'Mark as read', descriptionVi: 'Đánh dấu đã đọc' },
            { keys: ['Shift', 'u'], description: 'Mark as unread', descriptionVi: 'Đánh dấu chưa đọc' },
            { keys: ['!'], description: 'Report spam', descriptionVi: 'Báo spam' },
        ],
    },
    {
        category: 'Folders',
        categoryVi: 'Thư mục',
        shortcuts: [
            { keys: ['g', 'i'], description: 'Go to Inbox', descriptionVi: 'Đến Hộp thư đến' },
            { keys: ['g', 's'], description: 'Go to Starred', descriptionVi: 'Đến Đánh dấu sao' },
            { keys: ['g', 't'], description: 'Go to Sent', descriptionVi: 'Đến Đã gửi' },
            { keys: ['g', 'd'], description: 'Go to Drafts', descriptionVi: 'Đến Bản nháp' },
        ],
    },
    {
        category: 'Search',
        categoryVi: 'Tìm kiếm',
        shortcuts: [
            { keys: ['/'], description: 'Focus search', descriptionVi: 'Focus vào ô tìm kiếm' },
            { keys: ['?'], description: 'Show shortcuts', descriptionVi: 'Hiện phím tắt' },
        ],
    },
]

function KeyboardKey({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            {children}
        </kbd>
    )
}

interface KeyboardShortcutsProps {
    variant?: 'icon' | 'text'
}

export function KeyboardShortcuts({ variant = 'icon' }: KeyboardShortcutsProps) {
    const { language } = useI18n()
    const [open, setOpen] = React.useState(false)

    // Listen for "?" key to open shortcuts dialog
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger in input/textarea
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA'
            ) {
                return
            }

            if (e.key === '?') {
                e.preventDefault()
                setOpen(true)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            {variant === 'icon' ? (
                                <Button variant="ghost" size="icon">
                                    <Keyboard className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <Keyboard className="h-4 w-4" />
                                    <span>{language === 'vi' ? 'Phím tắt' : 'Shortcuts'}</span>
                                </Button>
                            )}
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{language === 'vi' ? 'Phím tắt (?)' : 'Keyboard shortcuts (?)'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="h-5 w-5" />
                        {language === 'vi' ? 'Phím tắt bàn phím' : 'Keyboard Shortcuts'}
                    </DialogTitle>
                    <DialogDescription>
                        {language === 'vi'
                            ? 'Sử dụng các phím tắt sau để điều hướng nhanh hơn'
                            : 'Use these keyboard shortcuts to navigate faster'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {KEYBOARD_SHORTCUTS.map((group) => (
                        <div key={group.category}>
                            <h3 className="mb-2 text-sm font-medium text-foreground">
                                {language === 'vi' ? group.categoryVi : group.category}
                            </h3>
                            <div className="space-y-2">
                                {group.shortcuts.map((shortcut, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between py-1"
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            {language === 'vi'
                                                ? shortcut.descriptionVi
                                                : shortcut.description}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, keyIndex) => (
                                                <React.Fragment key={key}>
                                                    {keyIndex > 0 && (
                                                        <span className="text-xs text-muted-foreground">+</span>
                                                    )}
                                                    <KeyboardKey>{key}</KeyboardKey>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center text-xs text-muted-foreground border-t pt-4">
                    {language === 'vi'
                        ? 'Nhấn ? để mở/đóng bảng phím tắt này'
                        : 'Press ? to open/close this shortcuts panel'}
                </div>
            </DialogContent>
        </Dialog>
    )
}
