import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

export default function ErrorBanner({ message, onRetry }) {
  return (
    <View style={s.box} accessibilityRole="alert">
      <Text style={s.text}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={s.retry} accessibilityRole="button">
          <Text style={s.retryText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.errBg, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 11 },
  text: { flex: 1, color: '#b33a32', fontSize: 13, fontFamily: fonts.sans },
  retry: { borderRadius: 7, borderWidth: 1, borderColor: '#f3c3be', paddingHorizontal: 12, paddingVertical: 6 },
  retryText: { color: colors.danger, fontFamily: fonts.sansBold, fontSize: 12 },
});
