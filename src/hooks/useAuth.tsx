import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, type ReactNode } from 'react'
import { login, logout, restoreSession } from '@/api/auth'
import { isRecoverableConnectionError } from '@/lib/session-policy'
import type { AdminUser } from '@/types'

type AuthContextValue = {
  user: AdminUser | null
  isLoading: boolean
  restoreError: unknown
  canRetryRestore: boolean
  retryRestore: () => void
  login: (email: string, password: string) => Promise<AdminUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const session = useQuery({
    queryKey: ['session'],
    queryFn: restoreSession,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: (count, error) => isRecoverableConnectionError(error) && count < 2,
  })

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(['session'], user)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['session'], null)
      queryClient.clear()
    },
  })

  const value: AuthContextValue = {
    user: session.data ?? null,
    isLoading: session.isPending && session.isFetching,
    restoreError: session.error,
    canRetryRestore: session.isError && isRecoverableConnectionError(session.error),
    retryRestore: () => {
      void session.refetch()
    },
    login: (email, password) => loginMutation.mutateAsync({ email, password }),
    logout: () => logoutMutation.mutateAsync(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth має бути всередині AuthProvider')
  return context
}
