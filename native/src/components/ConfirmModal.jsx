import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { money } from '../format';
import { colors, fonts } from '../theme';

const DELETE_BODY = 'Warning: This action cannot be undone. All associated customer records, daily transactions, and financial data for this timeframe will be permanently removed.';

// Text and colors copied from the web app's renderModal().
function copy(kind, subject, busy) {
  const danger = { kicker: true, left: true, bg: colors.danger, icon: '!', iconBg: '#fff0df', iconFg: colors.danger, confirm: busy ? 'Deleting…' : 'Delete' };
  const info = { bg: colors.blue, iconBg: '#fff4d6', iconFg: '#a87100' };
  switch (kind) {
    case 'year':
    case 'month':
      return { ...danger, title: `Are you sure you want to delete ${subject.label}?`, body: DELETE_BODY };
    case 'tx':
      return {
        ...danger,
        title: `Delete ${subject.name}'s transaction?`,
        body: `This removes the ${money(subject.total)} transaction recorded at ${subject.time} on ${subject.date}, including any payments on it. This cannot be undone.`,
      };
    case 'signout':
      return { ...info, icon: '↪', title: 'Sign Out of Bubblebee Laundry Shop?', body: 'Are you sure you want to log out? Any unsaved changes in active transaction drafts may be lost.', confirm: 'Yes, Sign Out' };
    default:
      return { ...info, icon: '!', title: 'Confirm Credential Update', body: 'Are you sure you want to update your login credentials? You will need to use these new credentials for future logins.', confirm: busy ? 'Saving…' : 'Yes, Save Changes' };
  }
}

export default function ConfirmModal({ visible, kind, subject = {}, busy = false, error = '', onConfirm, onCancel }) {
  if (!visible) return null;
  const v = copy(kind, subject, busy);
  const align = v.left ? 'left' : 'center';
  const cancel = () => { if (!busy) onCancel(); };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={cancel} statusBarTranslucent>
      <Pressable style={s.back} onPress={cancel}>
        <Pressable style={s.card} onPress={() => {}} accessibilityRole="alert">
          <View style={[s.icon, { backgroundColor: v.iconBg, alignSelf: v.left ? 'flex-start' : 'center' }]}>
            <Text style={[s.iconText, { color: v.iconFg }]}>{v.icon}</Text>
          </View>
          {v.kicker && <Text style={[s.kicker, { textAlign: align }]}>PERMANENT DELETION</Text>}
          <Text style={[s.title, { textAlign: align }]}>{v.title}</Text>
          <Text style={[s.body, { textAlign: align }]}>{v.body}</Text>
          {!!error && <Text style={s.error}>{error}</Text>}
          <Pressable
            style={[s.btn, { marginTop: 24, backgroundColor: v.bg, borderColor: v.bg, opacity: busy ? 0.6 : 1 }]}
            onPress={() => { if (!busy) onConfirm(); }}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
          >
            <Text style={s.btnText}>{v.confirm}</Text>
          </Pressable>
          <Pressable style={[s.btn, s.cancel]} onPress={cancel} accessibilityRole="button">
            <Text style={[s.btnText, { color: colors.navy }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  back: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(9,39,94,.46)' },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingVertical: 26, paddingHorizontal: 20 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 22, fontFamily: fonts.sansBold },
  kicker: { marginTop: 16, color: colors.danger, fontSize: 10, fontFamily: fonts.sansBold, letterSpacing: 1.2 },
  title: { marginTop: 12, color: colors.navy, fontSize: 21, lineHeight: 27, fontFamily: fonts.sansBold },
  body: { marginTop: 12, color: colors.muted, fontSize: 13, lineHeight: 20, fontFamily: fonts.sans },
  error: { marginTop: 12, color: '#b33a32', backgroundColor: colors.errBg, padding: 9, borderRadius: 6, fontSize: 12, fontFamily: fonts.sans },
  btn: { marginTop: 10, borderRadius: 8, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  cancel: { backgroundColor: '#fff', borderColor: colors.field },
  btnText: { color: '#fff', fontSize: 13, fontFamily: fonts.sansBold },
});
