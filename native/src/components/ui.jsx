import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, shadow } from '../theme';

// Building blocks shared by the signed-in screens (styles from src/mobile/mobile.css).

export function Page({ children, refreshing = false, onRefresh, style, scrollRef }) {
  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[ui.page, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export const Card = ({ children, style }) => <View style={[ui.card, style]}>{children}</View>;
export const H2 = ({ children, style }) => <Text style={[ui.h2, style]} accessibilityRole="header">{children}</Text>;
export const Sub = ({ children, style }) => <Text style={[ui.sub, style]}>{children}</Text>;
export const Label = ({ children }) => <Text style={ui.label}>{children}</Text>;

export const Field = ({ style, ...props }) => (
  <TextInput placeholderTextColor="#8b98aa" style={[ui.input, props.editable === false && ui.inputOff, style]} {...props} />
);

export function Button({ title, onPress, disabled = false, small = false, style, color = colors.blue }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [ui.btn, small && ui.btnSmall, { backgroundColor: pressed ? '#0d2f6a' : color, opacity: disabled ? 0.5 : 1 }, style]}
    >
      <Text style={[ui.btnText, small && { fontSize: 13 }]}>{title}</Text>
    </Pressable>
  );
}

export const Notice = ({ ok = true, text }) => (text ? <Text style={[ui.notice, ok ? ui.ok : ui.err]} accessibilityRole={ok ? undefined : 'alert'}>{text}</Text> : null);

export const Empty = ({ text }) => <Text style={ui.empty}>{text}</Text>;

export const Loading = () => <ActivityIndicator style={{ padding: 30 }} color={colors.blue} accessibilityLabel="Loading" />;

export const ui = StyleSheet.create({
  page: { paddingVertical: 24, paddingHorizontal: 18, gap: 20, flexGrow: 1 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 20, ...shadow.card },
  h2: { fontSize: 19, fontFamily: fonts.sansBold, color: colors.ink },
  sub: { fontSize: 14, fontFamily: fonts.sans, color: colors.muted },
  label: { marginTop: 15, fontSize: 12, fontFamily: fonts.sansBold, color: colors.navy },
  input: { marginTop: 7, padding: 11, borderWidth: 1, borderColor: colors.field, borderRadius: 8, backgroundColor: '#fff', fontSize: 16, fontFamily: fonts.sans, color: colors.ink },
  inputOff: { backgroundColor: '#f4f6f9', color: colors.muted },
  btn: { borderRadius: 10, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { borderRadius: 9, paddingVertical: 11 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: fonts.sansBold },
  notice: { padding: 9, borderRadius: 7, fontSize: 12, fontFamily: fonts.sans, overflow: 'hidden' },
  ok: { color: colors.ok, backgroundColor: colors.okBg },
  err: { color: '#b33a32', backgroundColor: colors.errBg },
  empty: { color: '#8b98aa', textAlign: 'center', padding: 24, fontSize: 13, fontFamily: fonts.sans },
  row: { flexDirection: 'row', gap: 8 },
});
