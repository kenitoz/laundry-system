import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text } from 'react-native';

import { MONTHS } from '../format';
import { colors, fonts } from '../theme';
import { ui } from './ui';

// Native stand-in for the web <select> of months. value is '' or '1'..'12'.
export default function MonthPicker({ value, onChange, style }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Month" onPress={() => setOpen(true)} style={[ui.input, s.field, style]}>
        <Text style={[s.value, !value && { color: '#8b98aa' }]}>{value ? MONTHS[Number(value) - 1] : 'Select month'}</Text>
        <Text style={s.caret}>▾</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={s.back} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <FlatList
              data={MONTHS}
              keyExtractor={(m) => m}
              renderItem={({ item, index }) => (
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [s.item, (pressed || value === String(index + 1)) && s.itemOn]}
                  onPress={() => { onChange(String(index + 1)); setOpen(false); }}
                >
                  <Text style={s.itemText}>{item}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { fontSize: 16, fontFamily: fonts.sans, color: colors.ink },
  caret: { color: colors.muted, fontSize: 14 },
  back: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: 'rgba(9,39,94,.46)' },
  sheet: { maxHeight: '75%', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 8 },
  item: { paddingVertical: 13, paddingHorizontal: 20 },
  itemOn: { backgroundColor: colors.softBlue },
  itemText: { fontSize: 16, fontFamily: fonts.sans, color: colors.ink },
});
