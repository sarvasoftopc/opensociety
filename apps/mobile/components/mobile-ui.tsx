import type { ReactNode } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

export function MobileScreen({
  children,
  scroll = false,
  contentStyle,
}: {
  children: ReactNode
  scroll?: boolean
  contentStyle?: object
}) {
  const body = (
    <View style={styles.stage}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scrollContent, contentStyle]}>{children}</ScrollView>
      ) : (
        <View style={[styles.content, contentStyle]}>{children}</View>
      )}
    </View>
  )

  return <SafeAreaView style={styles.safe}>{body}</SafeAreaView>
}

export function HeroCard({
  eyebrow,
  title,
  subtitle,
  badge,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  badge?: string
}) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTopRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>SS</Text>
        </View>
        {badge ? (
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
    </View>
  )
}

export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title?: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <View style={styles.sectionCard}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

export function MetricRow({ children }: { children: ReactNode }) {
  return <View style={styles.metricRow}>{children}</View>
}

export function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

export function HintText({ children }: { children: ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  )
}

export const mobileTheme = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#d8e1ef',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f8fbff',
    color: '#11203a',
    fontSize: 15,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#edf4ff',
    borderWidth: 1,
    borderColor: '#d6e5fb',
  },
  chipActive: {
    backgroundColor: '#11203a',
    borderColor: '#11203a',
  },
  chipText: {
    color: '#35507a',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#35507a',
  },
  card: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dfe7f5',
    gap: 10,
  },
  cardMuted: {
    backgroundColor: '#f8fbff',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#11203a',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: '#5b6b85',
  },
  meta: {
    fontSize: 12,
    color: '#71829b',
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#e9f6ee',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#217a47',
    fontSize: 11,
    fontWeight: '800',
  },
  error: {
    color: '#d92d20',
    fontSize: 13,
    fontWeight: '700',
  },
})

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#09111f',
  },
  stage: {
    flex: 1,
    backgroundColor: '#eef4fb',
  },
  glowTop: {
    position: 'absolute',
    top: -70,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: '#c6ecff',
    opacity: 0.5,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -120,
    left: -30,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: '#dce9ff',
    opacity: 0.55,
  },
  scrollContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    padding: 18,
    gap: 16,
  },
  heroCard: {
    borderRadius: 30,
    padding: 22,
    backgroundColor: '#0f1b31',
    gap: 10,
    shadowColor: '#07101d',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7dd3fc',
  },
  brandMarkText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f1b31',
  },
  heroBadge: {
    borderRadius: 999,
    backgroundColor: '#173156',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeText: {
    color: '#d9ebff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  eyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#bfd2ec',
    fontSize: 14,
    lineHeight: 21,
  },
  sectionCard: {
    borderRadius: 26,
    padding: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dde7f6',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#11203a',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6a7b94',
  },
  sectionBody: {
    marginTop: 8,
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    backgroundColor: '#f5f9ff',
    borderWidth: 1,
    borderColor: '#deebfb',
    gap: 6,
  },
  metricValue: {
    color: '#11203a',
    fontSize: 26,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#5e7090',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  hint: {
    color: '#6d7d95',
    fontSize: 13,
    lineHeight: 19,
  },
  emptyState: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#f6faff',
    borderWidth: 1,
    borderColor: '#dbe8f8',
    gap: 6,
  },
  emptyTitle: {
    color: '#11203a',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyBody: {
    color: '#687992',
    fontSize: 14,
    lineHeight: 20,
  },
})
