import { Pressable, StyleSheet, Text } from 'react-native'

export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  variant?: 'primary' | 'outline' | 'danger'
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, styles[variant], disabled && styles.btnDisabled]}
    >
      <Text style={[styles.btnText, variant === 'outline' && styles.btnTextOutline]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.5 },
  primary: { backgroundColor: '#11203a' },
  danger: { backgroundColor: '#d92d20' },
  outline: { backgroundColor: '#f8fbff', borderWidth: 1, borderColor: '#d7e2f1' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnTextOutline: { color: '#35507a' },
})
