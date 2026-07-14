import { useEffect, useRef, useState } from 'react'
import { Link } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, Modal, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { availableVisitorActions, parsePreApprovalQrValue } from '@opensociety/shared'

import { apiClient } from '../api/client'
import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'

export default function Gate() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['visitors'],
    queryFn: () => apiClient.listVisitors(),
  })

  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const invalidate = () => qc.invalidateQueries({ queryKey: ['visitors'] })
  const checkIn = useMutation({
    mutationFn: (id: string) => apiClient.checkInVisitor(id),
    onSuccess: invalidate,
  })
  const checkOut = useMutation({
    mutationFn: (id: string) => apiClient.checkOutVisitor(id),
    onSuccess: invalidate,
  })
  const redeem = useMutation({
    mutationFn: (c: string) => apiClient.redeemPreApproval(c),
    onSuccess: () => {
      setCode('')
      invalidate()
    },
  })
  const busy = checkIn.isPending || checkOut.isPending

  if (isLoading) {
    return (
      <MobileScreen>
        <Centered>
          <ActivityIndicator />
        </Centered>
      </MobileScreen>
    )
  }

  if (isError) {
    return (
      <MobileScreen>
        <SectionCard title="Gate queue unavailable">
          <Text style={styles.error}>API unreachable</Text>
          <Text style={styles.dim}>{String((error as Error)?.message ?? 'error')}</Text>
        </SectionCard>
      </MobileScreen>
    )
  }

  const gate = (data ?? []).filter((v) => v.status === 'APPROVED' || v.status === 'ENTERED')

  return (
    <MobileScreen>
      <>
        <FlatList
          contentContainerStyle={styles.list}
          data={gate}
          keyExtractor={(v) => v.id}
          ListHeaderComponent={
            <View style={styles.header}>
              <HeroCard
                eyebrow="Guard"
                title="Gate queue"
                subtitle="Register walk-ins here. A resident approval request is sent to the resident app before entry."
                badge={`${gate.length} in queue`}
              />
              <SectionCard title="Redeem pre-approval" subtitle="Use the code shared by the resident or scan a QR on-device.">
                <TextInput
                  style={mobileTheme.input}
                  placeholder="Pre-approval code"
                  placeholderTextColor="#7a8aa3"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={code}
                  onChangeText={setCode}
                />
                <Button
                  label={redeem.isPending ? 'Redeeming…' : 'Redeem'}
                  onPress={() => redeem.mutate(code.trim().toUpperCase())}
                  disabled={redeem.isPending || code.trim().length === 0}
                />
                <Button label="Scan QR code" variant="outline" onPress={() => setScanning(true)} />
                {redeem.isError ? (
                  <Text style={styles.redeemError}>{String((redeem.error as Error)?.message ?? 'Invalid code')}</Text>
                ) : null}
                <Link href="/register" style={styles.register}>
                  + Register walk-in visitor
                </Link>
              </SectionCard>
            </View>
          }
          ListEmptyComponent={<Text style={styles.dim}>No visitors at the gate.</Text>}
          renderItem={({ item }) => {
            const actions = availableVisitorActions(item.status)
            return (
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.visitorName}</Text>
                    <Text style={styles.dim}>
                      {[item.apartmentLabel, item.type, item.partnerName, item.purpose].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text style={styles.badge}>{item.status}</Text>
                </View>
                <View style={styles.actions}>
                  {actions.includes('checkin') ? (
                    <Button label="Check in" onPress={() => checkIn.mutate(item.id)} disabled={busy} />
                  ) : null}
                  {actions.includes('checkout') ? (
                    <Button
                      label="Check out"
                      variant="outline"
                      onPress={() => checkOut.mutate(item.id)}
                      disabled={busy}
                    />
                  ) : null}
                </View>
              </View>
            )
          }}
        />
        <QrScannerModal
          visible={scanning}
          onClose={() => setScanning(false)}
          onScan={(c) => {
            setScanning(false)
            redeem.mutate(c)
          }}
        />
      </>
    </MobileScreen>
  )
}

function QrScannerModal({
  visible,
  onClose,
  onScan,
}: {
  visible: boolean
  onClose: () => void
  onScan: (code: string) => void
}) {
  const [permission, requestPermission] = useCameraPermissions()
  const handledRef = useRef(false)

  useEffect(() => {
    if (visible) handledRef.current = false
  }, [visible])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.scanner}>
        {Platform.OS === 'web' ? (
          <View style={styles.scannerMsg}>
            <Text style={styles.scannerMsgText}>
              QR scanning uses the device camera. Open the app on a phone, or enter the code manually.
            </Text>
          </View>
        ) : !permission ? (
          <ActivityIndicator />
        ) : !permission.granted ? (
          <View style={styles.scannerMsg}>
            <Text style={styles.scannerMsgText}>Camera access is needed to scan pre-approval QR codes.</Text>
            <Button label="Grant camera access" onPress={requestPermission} />
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (handledRef.current) return
                const code = parsePreApprovalQrValue(data)
                if (!code) return
                handledRef.current = true
                onScan(code)
              }}
            />
            <View style={styles.scannerHint} pointerEvents="none">
              <Text style={styles.scannerHintText}>Point the camera at the pre-approval QR code</Text>
            </View>
          </>
        )}
        <View style={styles.scannerCancel}>
          <Button label="Cancel" variant="outline" onPress={onClose} />
        </View>
      </View>
    </Modal>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>
}

const styles = StyleSheet.create({
  list: { padding: 18, gap: 12, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  header: { gap: 14, marginBottom: 4 },
  card: { padding: 16, borderRadius: 24, backgroundColor: '#ffffff', gap: 10, borderWidth: 1, borderColor: '#dce8f7' },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '800', color: '#11203a' },
  dim: { color: '#697a94', fontSize: 13 },
  error: { color: '#d92d20', fontSize: 16, fontWeight: '700' },
  badge: {
    fontSize: 12,
    color: '#35507a',
    backgroundColor: '#edf4ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '800',
  },
  actions: { flexDirection: 'row', gap: 8 },
  redeemError: { color: '#d92d20', fontSize: 13, fontWeight: '700' },
  register: { color: '#244c80', fontWeight: '700', fontSize: 15, paddingVertical: 4 },
  scanner: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  scannerMsg: { padding: 24, gap: 16, alignItems: 'center' },
  scannerMsgText: { color: '#fff', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  scannerHint: { position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center' },
  scannerHintText: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  scannerCancel: { position: 'absolute', bottom: 40, left: 24, right: 24 },
})
