import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'

import { apiClient } from '../api/client'
import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'

const CHECKPOINTS = ['Main gate', 'Tower A', 'Tower B', 'Clubhouse', 'Parking', 'Service gate']

export default function Duty() {
  const qc = useQueryClient()
  const [checkpoint, setCheckpoint] = useState('Main gate')
  const [customCheckpoint, setCustomCheckpoint] = useState('')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  const me = useQuery({ queryKey: ['duty-me'], queryFn: () => apiClient.me() })
  const guards = useQuery({ queryKey: ['guards'], queryFn: () => apiClient.listGuards() })
  const active = useQuery({ queryKey: ['duty-active'], queryFn: () => apiClient.listActiveDuty() })

  const meGuard = useMemo(
    () => (guards.data ?? []).find((guard) => guard.userId === me.data?.id) ?? null,
    [guards.data, me.data?.id],
  )
  const mySession = useMemo(
    () => (active.data ?? []).find((session) => session.guardId === meGuard?.id) ?? null,
    [active.data, meGuard?.id],
  )

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['guards'] })
    qc.invalidateQueries({ queryKey: ['duty-active'] })
  }

  const clockIn = useMutation({
    mutationFn: async () => {
      if (!meGuard) throw new Error('Guard profile is not linked yet.')
      if (!photoUri) throw new Error('Attendance photo is required.')
      const uploaded = await apiClient.uploadImage(photoUri)
      const point = checkpoint === 'Other' ? customCheckpoint.trim() : checkpoint
      return apiClient.clockInGuard(meGuard.id, { checkpoint: point, clockInPhotoUrl: uploaded.url })
    },
    onSuccess: invalidate,
  })
  const clockOut = useMutation({
    mutationFn: () => apiClient.clockOutGuard(mySession!.id),
    onSuccess: invalidate,
  })

  if (guards.isLoading || active.isLoading || me.isLoading) {
    return (
      <MobileScreen>
        <Centered>
          <ActivityIndicator />
        </Centered>
      </MobileScreen>
    )
  }

  return (
    <MobileScreen scroll contentStyle={styles.list}>
      <HeroCard
        eyebrow="Guard"
        title="Mark attendance"
        subtitle="Guards clock in with a checkpoint and photo so residents can see who is on duty where."
        badge={mySession ? 'On duty' : 'Clock in required'}
      />

      <SectionCard title="My duty status" subtitle={meGuard ? `${meGuard.name} · ${meGuard.employeeCode ?? 'No employee code'}` : 'Guard profile missing'}>
        {meGuard ? (
          <>
            <Text style={styles.status}>{mySession ? `On duty at ${mySession.checkpoint ?? 'Checkpoint not set'}` : 'You are currently off duty.'}</Text>
            {mySession ? (
              <Button label={clockOut.isPending ? 'Clocking out…' : 'Clock out'} variant="outline" onPress={() => clockOut.mutate()} disabled={clockOut.isPending} />
            ) : (
              <>
                <Text style={styles.label}>Checkpoint</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {[...CHECKPOINTS, 'Other'].map((item) => (
                    <Chip key={item} label={item} selected={checkpoint === item} onPress={() => setCheckpoint(item)} />
                  ))}
                </ScrollView>
                {checkpoint === 'Other' ? (
                  <TextInput
                    style={mobileTheme.input}
                    placeholder="Type checkpoint name"
                    placeholderTextColor="#7a8aa3"
                    value={customCheckpoint}
                    onChangeText={setCustomCheckpoint}
                  />
                ) : null}
                <Text style={styles.label}>Attendance photo</Text>
                {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : null}
                <Button label={photoUri ? 'Retake photo' : 'Capture photo'} variant="outline" onPress={() => setCameraOpen(true)} />
                <Button
                  label={clockIn.isPending ? 'Clocking in…' : 'Clock in'}
                  onPress={() => clockIn.mutate()}
                  disabled={clockIn.isPending || !photoUri || (checkpoint === 'Other' && customCheckpoint.trim().length === 0)}
                />
              </>
            )}
            {clockIn.isError ? <Text style={styles.error}>{String((clockIn.error as Error)?.message ?? 'Clock in failed')}</Text> : null}
          </>
        ) : (
          <Text style={styles.error}>This signed-in user is not linked to a guard record yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Society live roster" subtitle="Residents and admins can use this data to see active guards.">
        {(active.data ?? []).map((session) => (
          <View key={session.id} style={styles.rosterCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rosterTitle}>{session.guardName ?? 'Guard'}</Text>
              <Text style={styles.rosterMeta}>
                {session.checkpoint ?? 'Checkpoint pending'} · {new Date(session.clockInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={styles.liveBadge}>LIVE</Text>
          </View>
        ))}
        {(active.data ?? []).length === 0 ? <Text style={styles.status}>No guard is currently clocked in.</Text> : null}
      </SectionCard>

      <CameraCaptureModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(uri) => {
          setPhotoUri(uri)
          setCameraOpen(false)
        }}
      />
    </MobileScreen>
  )
}

function CameraCaptureModal({
  visible,
  onClose,
  onCapture,
}: {
  visible: boolean
  onClose: () => void
  onCapture: (uri: string) => void
}) {
  const cameraRef = useRef<CameraView | null>(null)
  const [permission, requestPermission] = useCameraPermissions()

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.cameraWrap}>
        {!permission ? (
          <ActivityIndicator />
        ) : !permission.granted ? (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionText}>Camera access is required for attendance capture.</Text>
            <Button label="Grant access" onPress={requestPermission} />
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
            <View style={styles.cameraActions}>
              <Button label="Cancel" variant="outline" onPress={onClose} />
              <Button
                label="Capture"
                onPress={async () => {
                  const result = await cameraRef.current?.takePictureAsync({ quality: 0.6 })
                  if (result?.uri) onCapture(result.uri)
                }}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  )
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[mobileTheme.chip, selected && mobileTheme.chipActive]}>
      <Text style={[mobileTheme.chipText, selected && mobileTheme.chipTextActive]}>{label}</Text>
    </Pressable>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>
}

const styles = StyleSheet.create({
  list: { gap: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 13, fontWeight: '700', color: '#35507a' },
  status: { color: '#475569', fontSize: 14, lineHeight: 21 },
  chips: { gap: 10, paddingRight: 8 },
  photoPreview: { width: '100%', height: 220, borderRadius: 20, backgroundColor: '#e2e8f0' },
  rosterCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 22, padding: 14, backgroundColor: '#effaf3', borderWidth: 1, borderColor: '#ccebd4' },
  rosterTitle: { color: '#11203a', fontSize: 16, fontWeight: '800' },
  rosterMeta: { color: '#64748b', fontSize: 13 },
  liveBadge: { color: '#15803d', fontSize: 12, fontWeight: '900' },
  error: { color: '#d92d20', fontSize: 13, fontWeight: '700' },
  cameraWrap: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  cameraActions: { position: 'absolute', left: 20, right: 20, bottom: 40, gap: 10 },
  permissionCard: { gap: 16, padding: 24, margin: 20, borderRadius: 24, backgroundColor: '#fff' },
  permissionText: { color: '#334155', fontSize: 15, lineHeight: 22 },
})
