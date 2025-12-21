'use client';

import { useState, useCallback, useEffect } from 'react';
import { Email } from '@/types';
import { emailService, Folder, EmailFilters } from '@/services/email-service';
import { useAuth } from '@/contexts/auth-context';
import { useSocket } from './use-socket';

interface UseEmailsOptions {
  initialFolder?: Folder;
  perPage?: number;
}

interface UseEmailsReturn {
  emails: Email[];
  selectedEmail: Email | null;
  loading: boolean;
  error: string | null;
  folder: Folder;
  page: number;
  totalPages: number;
  totalEmails: number;
  unreadCounts: Record<Folder, number>;
  // Actions
  setFolder: (folder: Folder) => void;
  selectEmail: (email: Email | null) => void;
  selectEmailById: (id: string) => void;
  refreshEmails: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  moveToSpam: (id: string) => Promise<void>;
  restoreEmail: (id: string) => Promise<void>;
  deleteEmail: (id: string) => Promise<void>;
  searchEmails: (query: string) => Promise<void>;
  clearSearch: () => void;
}

export function useEmails(options: UseEmailsOptions = {}): UseEmailsReturn {
  const { initialFolder = 'inbox', perPage = 50 } = options;
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolderState] = useState<Folder>(initialFolder);
  const [page, setPage] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<Folder, number>>({
    inbox: 0,
    sent: 0,
    drafts: 0,
    spam: 0,
    trash: 0,
    starred: 0,
    important: 0,
    social: 0,
    updates: 0,
    promotions: 0,
    archive: 0,
  });

  const totalPages = Math.ceil(totalEmails / perPage);

  // Fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;
    try {
      const counts = await emailService.getUnreadCounts();
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Error fetching unread counts:', err);
    }
  }, [user]);

  // Fetch emails
  const fetchEmails = useCallback(async (filters: EmailFilters = {}) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const result = await emailService.getEmails({
        folder,
        page,
        limit: perPage,
        search: searchQuery || undefined,
        ...filters,
      });

      setEmails(result.emails);
      setTotalEmails(result.pagination.total);
      
      // Also refresh unread counts
      fetchUnreadCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  }, [user, folder, page, perPage, searchQuery, fetchUnreadCounts]);

  // Initial fetch and refetch when folder/page changes
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Listen for new emails via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewEmail = (newEmail: Email) => {
      // Add new email to the list if in inbox folder
      if (folder === 'inbox') {
        setEmails(prev => [newEmail, ...prev]);
        setTotalEmails(prev => prev + 1);
      }
      
      // Update unread count
      setUnreadCounts(prev => ({
        ...prev,
        inbox: prev.inbox + 1,
      }));
    };

    const handleEmailUpdated = (updatedEmail: Email) => {
      setEmails(prev => 
        prev.map(email => 
          email.id === updatedEmail.id ? updatedEmail : email
        )
      );

      if (selectedEmail?.id === updatedEmail.id) {
        setSelectedEmail(updatedEmail);
      }
    };

    socket.on('new-email', handleNewEmail);
    socket.on('email-updated', handleEmailUpdated);

    return () => {
      socket.off('new-email', handleNewEmail);
      socket.off('email-updated', handleEmailUpdated);
    };
  }, [socket, isConnected, folder, selectedEmail?.id]);

  // Actions
  const setFolder = useCallback((newFolder: Folder) => {
    setFolderState(newFolder);
    setPage(1);
    setSelectedEmail(null);
    setSearchQuery(null);
  }, []);

  const selectEmail = useCallback((email: Email | null) => {
    setSelectedEmail(email);
    
    // Mark as read when selected
    if (email && !email.is_read) {
      emailService.updateEmail(email.id, { is_read: true }).then(() => {
        setEmails(prev =>
          prev.map(e => (e.id === email.id ? { ...e, is_read: true } : e))
        );
        setSelectedEmail(prev => prev ? { ...prev, is_read: true } : null);
      });
    }
  }, []);

  const selectEmailById = useCallback((id: string) => {
    const email = emails.find(e => e.id === id);
    if (email) {
      selectEmail(email);
    }
  }, [emails, selectEmail]);

  const refreshEmails = useCallback(async () => {
    await fetchEmails();
  }, [fetchEmails]);

  const loadMore = useCallback(async () => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [page, totalPages]);

  const markAsRead = useCallback(async (id: string) => {
    const success = await emailService.updateEmail(id, { is_read: true });
    if (success) {
      setEmails(prev =>
        prev.map(e => (e.id === id ? { ...e, is_read: true } : e))
      );
      if (selectedEmail?.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, is_read: true } : null);
      }
      // Refresh unread counts
      fetchUnreadCounts();
    }
  }, [selectedEmail?.id, fetchUnreadCounts]);

  const markAsUnread = useCallback(async (id: string) => {
    const success = await emailService.updateEmail(id, { is_read: false });
    if (success) {
      setEmails(prev =>
        prev.map(e => (e.id === id ? { ...e, is_read: false } : e))
      );
      if (selectedEmail?.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, is_read: false } : null);
      }
      // Refresh unread counts
      fetchUnreadCounts();
    }
  }, [selectedEmail?.id, fetchUnreadCounts]);

  const toggleStar = useCallback(async (id: string) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;

    const success = await emailService.updateEmail(id, { is_starred: !email.is_starred });
    if (success) {
      setEmails(prev =>
        prev.map(e => (e.id === id ? { ...e, is_starred: !e.is_starred } : e))
      );
      if (selectedEmail?.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, is_starred: !prev.is_starred } : null);
      }
    }
  }, [emails, selectedEmail?.id]);

  const moveToTrash = useCallback(async (id: string) => {
    const success = await emailService.updateEmail(id, { is_trashed: true });
    if (success) {
      setEmails(prev => prev.filter(e => e.id !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
    }
  }, [selectedEmail?.id]);

  const moveToSpam = useCallback(async (id: string) => {
    const success = await emailService.updateEmail(id, { is_spam: true });
    if (success) {
      setEmails(prev => prev.filter(e => e.id !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
    }
  }, [selectedEmail?.id]);

  const restoreEmail = useCallback(async (id: string) => {
    const success = await emailService.bulkAction('restore', [id]);
    if (success) {
      setEmails(prev => prev.filter(e => e.id !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
    }
  }, [selectedEmail?.id]);

  const deleteEmail = useCallback(async (id: string) => {
    const success = await emailService.deleteEmail(id);
    if (success) {
      setEmails(prev => prev.filter(e => e.id !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
    }
  }, [selectedEmail?.id]);

  const searchEmails = useCallback(async (query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery(null);
    setPage(1);
  }, []);

  return {
    emails,
    selectedEmail,
    loading,
    error,
    folder,
    page,
    totalPages,
    totalEmails,
    unreadCounts,
    setFolder,
    selectEmail,
    selectEmailById,
    refreshEmails,
    loadMore,
    markAsRead,
    markAsUnread,
    toggleStar,
    moveToTrash,
    moveToSpam,
    restoreEmail,
    deleteEmail,
    searchEmails,
    clearSearch,
  };
}
