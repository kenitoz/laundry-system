import { Pressable, StyleSheet, Text } from 'react-native';

import { PowderIcon } from '../components/icons';
import { fonts } from '../theme';

export default function PowderButton({ soap, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Toss laundry powder into the machine"
      onPress={onPress}
      style={({ pressed }) => [s.tile, pressed && { transform: [{ scale: 0.94 }], backgroundColor: 'rgba(255,255,255,.16)' }]}
    >
      <PowderIcon />
      <Text style={s.label}>{soap ? 'MORE SOAP' : 'POWDER'}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tile: { width: 96, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.18)', backgroundColor: 'rgba(255,255,255,.08)', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 4 },
  label: { color: '#fff', fontSize: 11, fontFamily: fonts.sansBold, letterSpacing: 0.7 },
});
