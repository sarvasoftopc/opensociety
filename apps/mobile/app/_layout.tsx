import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthSessionProvider } from '../lib/auth-session'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function Nav() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f1b31' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#eef4fb' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'SarvaSociety' }} />
      <Stack.Screen name="community" options={{ title: 'Community' }} />
      <Stack.Screen name="homes" options={{ title: 'Homes' }} />
      <Stack.Screen name="services" options={{ title: 'Services' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
      <Stack.Screen name="visitors" options={{ title: 'Visitors' }} />
      <Stack.Screen name="pre-approve" options={{ title: 'Pre-approve visitor' }} />
      <Stack.Screen name="notices" options={{ title: 'Notices' }} />
      <Stack.Screen name="notice/[id]" options={{ title: 'Notice details' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="tickets" options={{ title: 'Maintenance' }} />
      <Stack.Screen name="gate" options={{ title: 'Gate' }} />
      <Stack.Screen name="duty" options={{ title: 'Guard duty' }} />
      <Stack.Screen name="register" options={{ title: 'Register visitor' }} />
      <Stack.Screen name="house-help" options={{ title: 'House help' }} />
      <Stack.Screen name="my-house-help" options={{ title: 'My house help' }} />
      <Stack.Screen name="my-vehicles" options={{ title: 'My vehicles' }} />
      <Stack.Screen name="bills" options={{ title: 'Bills' }} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <QueryClientProvider client={queryClient}>
        <Nav />
      </QueryClientProvider>
    </AuthSessionProvider>
  )
}
