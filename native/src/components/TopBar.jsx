import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '../theme';
import Brand from './Brand';

export default function TopBar({ canBack, onBack, dateChip }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingTop: insets.top + 10 }]}>
      {canBack && (
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={s.back} hitSlop={6}>
          <Text style={s.backText}>←</Text>
        </Pressable>
      )}
      <Brand />
      {!!dateChip && <Text style={s.chip}>{dateChip}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: colors.navy },
  back: { width: 40, height: 40, marginLeft: -8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#c5d8f4', fontSize: 20 },
  chip: { marginLeft: 'auto', backgroundColor: colors.yellow, color: colors.navy, fontSize: 12, fontFamily: fonts.sansBold, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, overflow: 'hidden' },
});
