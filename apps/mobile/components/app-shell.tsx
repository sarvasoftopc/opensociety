import { Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type ResidentNavKey = 'home' | 'community' | 'homes' | 'services'

const RESIDENT_ITEMS: Array<{
  key: ResidentNavKey
  label: string
  href: '/' | '/community' | '/homes' | '/services'
  icon: keyof typeof Ionicons.glyphMap
}> = [
  { key: 'home', label: 'Home', href: '/', icon: 'home-outline' },
  { key: 'community', label: 'Community', href: '/community', icon: 'chatbubble-ellipses-outline' },
  { key: 'homes', label: 'Homes', href: '/homes', icon: 'business-outline' },
  { key: 'services', label: 'Services', href: '/services', icon: 'construct-outline' },
]

export function AppTopBar({
  title,
  subtitle,
  avatarText,
  profileHref = '/profile',
}: {
  title: string
  subtitle: string
  avatarText: string
  profileHref?: '/profile'
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <View style={styles.crownBadge}>
          <Ionicons color="#fff" name="sparkles-outline" size={16} />
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <Link href={profileHref} asChild>
        <Pressable style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{avatarText}</Text>
        </Pressable>
      </Link>
    </View>
  )
}

export function ResidentBottomNav({ active }: { active: ResidentNavKey }) {
  return (
    <View style={styles.bottomNav}>
      {RESIDENT_ITEMS.map((item) => (
        <Link key={item.key} href={item.href} asChild>
          <Pressable style={styles.bottomNavItem}>
            <Ionicons color={item.key === active ? '#111827' : '#a0a6af'} name={item.icon} size={22} />
            <Text style={[styles.bottomNavLabel, item.key === active && styles.bottomNavLabelActive]}>{item.label}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  crownBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5b7db0',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 28,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#d7e3f4',
    shadowColor: '#7c8ca5',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  bottomNavItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 62,
  },
  bottomNavLabel: {
    color: '#a0a6af',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomNavLabelActive: {
    color: '#111827',
  },
})
