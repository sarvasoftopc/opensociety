import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { visitorTypeSchema, type VisitorType } from '@opensociety/shared'

import { apiClient } from '../api/client'
import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'

const TYPES = visitorTypeSchema.options
const PARTNERS = ['Amazon', 'Flipkart', 'Myntra', 'Swiggy', 'Zomato', 'House Help', 'Porter', 'Urban Company', 'Other']

export default function Register() {
  const router = useRouter()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [purpose, setPurpose] = useState('')
  const [search, setSearch] = useState('')
  const [partnerName, setPartnerName] = useState('House Help')
  const [customPartner, setCustomPartner] = useState('')
  const [type, setType] = useState<VisitorType>('SERVICE')
  const [apartmentId, setApartmentId] = useState<string | null>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })

  const filteredApartments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (apartments.data ?? []).filter((apartment) => {
      const label = `${apartment.tower}-${apartment.apartmentNo}`.toLowerCase()
      return query.length === 0 || label.includes(query)
    })
  }, [apartments.data, search])

  const create = useMutation({
    mutationFn: async () => {
      const uploaded = photoUri ? await apiClient.uploadImage(photoUri) : null
      return apiClient.createVisitor({
        apartmentId: apartmentId!,
        visitorName: name.trim(),
        visitorPhone: phone.trim() || undefined,
        purpose: purpose.trim(),
        partnerName: (partnerName === 'Other' ? customPartner : partnerName).trim() || undefined,
        photoUrl: uploaded?.url,
        type,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors'] })
      router.replace('/gate')
    },
  })

  const canSubmit =
    name.trim().length > 0 &&
    purpose.trim().length > 0 &&
    !!apartmentId &&
    !!photoUri &&
    !create.isPending

  return (
    <MobileScreen scroll contentStyle={styles.container}>
      <HeroCard
        eyebrow="Guard"
        title="Register a walk-in visitor"
        subtitle="Search the apartment quickly, capture a visitor photo, and push a detailed approval request to the resident."
        badge="Walk-in"
      />

      <SectionCard title="Visitor details">
        <Field label="Visitor name">
          <TextInput
            style={mobileTheme.input}
            placeholder="e.g. Rahul"
            placeholderTextColor="#7a8aa3"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </Field>

        <Field label="Phone (optional)">
          <TextInput
            style={mobileTheme.input}
            placeholder="10-digit number"
            placeholderTextColor="#7a8aa3"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </Field>

        <Field label="Purpose">
          <TextInput
            style={[mobileTheme.input, mobileTheme.multiline]}
            placeholder="Why are they visiting?"
            placeholderTextColor="#7a8aa3"
            value={purpose}
            onChangeText={setPurpose}
            multiline
          />
        </Field>

        <Field label="Visitor type">
          <View style={mobileTheme.chipRow}>
            {TYPES.map((item) => (
              <Chip key={item} label={item} selected={type === item} onPress={() => setType(item)} />
            ))}
          </View>
        </Field>

        <Field label="Company / partner">
          <View style={mobileTheme.chipRow}>
            {PARTNERS.map((item) => (
              <Chip key={item} label={item} selected={partnerName === item} onPress={() => setPartnerName(item)} />
            ))}
          </View>
          {partnerName === 'Other' ? (
            <TextInput
              style={mobileTheme.input}
              placeholder="Partner / company name"
              placeholderTextColor="#7a8aa3"
              value={customPartner}
              onChangeText={setCustomPartner}
            />
          ) : null}
        </Field>

        <Field label="Visitor photo">
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : null}
          <Button label={photoUri ? 'Retake photo' : 'Capture photo'} variant="outline" onPress={() => setCameraOpen(true)} />
          <Text style={styles.hint}>Photo is required so residents and guards can identify the visitor clearly.</Text>
        </Field>
      </SectionCard>

      <SectionCard title="Apartment selection" subtitle="Search by flat number like A-0101 and pick the destination flat.">
        <TextInput
          style={mobileTheme.input}
          placeholder="Search apartment e.g. A-0101"
          placeholderTextColor="#7a8aa3"
          value={search}
          onChangeText={setSearch}
        />
        {apartments.isLoading ? (
          <ActivityIndicator />
        ) : apartments.isError ? (
          <Text style={styles.error}>Could not load apartments</Text>
        ) : (
          <ScrollView style={styles.apartmentScroll} contentContainerStyle={styles.apartmentGrid}>
            {filteredApartments.map((apartment) => (
              <Chip
                key={apartment.id}
                label={`${apartment.tower}-${apartment.apartmentNo}`}
                selected={apartmentId === apartment.id}
                onPress={() => setApartmentId(apartment.id)}
              />
            ))}
            {filteredApartments.length === 0 ? <Text style={styles.hint}>No apartments match your search.</Text> : null}
          </ScrollView>
        )}
      </SectionCard>

      <View style={styles.submit}>
        <Button
          label={create.isPending ? 'Registering…' : 'Register visitor'}
          onPress={() => create.mutate()}
          disabled={!canSubmit}
        />
        {create.isError ? <Text style={styles.error}>{String((create.error as Error)?.message ?? 'Failed')}</Text> : null}
      </View>

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
            <Text style={styles.permissionText}>Camera access is required to capture the visitor photo.</Text>
            <Button label="Grant access" onPress={requestPermission} />
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[mobileTheme.chip, selected && mobileTheme.chipActive]}>
      <Text style={[mobileTheme.chipText, selected && mobileTheme.chipTextActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { gap: 16, paddingBottom: 40 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#35507a' },
  submit: { gap: 8, marginTop: 4 },
  error: { color: '#d92d20', fontSize: 13, fontWeight: '700' },
  hint: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  apartmentScroll: { maxHeight: 220 },
  apartmentGrid: { gap: 10, flexDirection: 'row', flexWrap: 'wrap' },
  photoPreview: { width: '100%', height: 220, borderRadius: 20, backgroundColor: '#e2e8f0' },
  cameraWrap: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  cameraActions: { position: 'absolute', left: 20, right: 20, bottom: 40, gap: 10 },
  permissionCard: { gap: 16, padding: 24, margin: 20, borderRadius: 24, backgroundColor: '#fff' },
  permissionText: { color: '#334155', fontSize: 15, lineHeight: 22 },
})
