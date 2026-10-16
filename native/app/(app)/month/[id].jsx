import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../../src/api';
import ErrorBanner from '../../../src/components/ErrorBanner';
import { Loading, Page } from '../../../src/components/ui';
import { buildCalendar, fmtDate, MONTHS, shortMoney, todayISO, ymd } from '../../../src/format';
import { useSession } from '../../../src/session';
import { colors, fonts } from '../../../src/theme';
import { useRemote } from '../../../src/useRemote';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthScreen() {
  const id = Number(useLocalSearchParams().id);
  const { selectDate } = useSession();
  const cal = useRemote(() => api(`/months/${id}/calendar`), [id]);
  const today = todayISO();

  const pick = async (date) => {
    await selectDate(date);
    router.replace('/dashboard');
  };

  const c = cal.data;
  return (
    <Page refreshing={cal.refreshing} onRefresh={cal.refresh} style={{ paddingHorizontal: 14 }}>
      {cal.error && <ErrorBanner message={cal.error.message} onRetry={cal.reload} />}
      {cal.loading && <Loading />}
      {c && (
        <>
          <Text style={s.title} accessibilityRole="header">Select a date · {MONTHS[c.month - 1]} {c.year}</Text>
          <View style={s.cal}>
            <View style={s.head}>{WEEKDAYS.map((w) => <Text key={w} style={s.weekday}>{w}</Text>)}</View>
            <View style={s.grid}>
              {buildCalendar(c.year, c.month).map((d, i) => {
                if (!d) return <View key={i} style={s.cell} />;
                const date = ymd(c.year, c.month, d), info = c.days[String(d)], isToday = date === today;
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={fmtDate(date, 'long')}
                    onPress={() => pick(date)}
                    style={({ pressed }) => [s.cell, { backgroundColor: pressed ? '#f0f6ff' : isToday ? colors.softBlue : '#fff' }]}
                  >
                    <Text style={[s.day, { color: isToday ? colors.brand : colors.ink }]}>{d}</Text>
                    <Text style={s.paid}>{info ? shortMoney(Number(info.total_paid) || 0) : ''}</Text>
                    <Text style={s.count}>{info ? `${info.count} tx` : 'No tx'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}
    </Page>
  );
}

const s = StyleSheet.create({
  title: { color: colors.navy, fontSize: 19, fontFamily: fonts.sansBold, paddingHorizontal: 4 },
  cal: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' },
  head: { flexDirection: 'row', backgroundColor: '#f1f5fb' },
  weekday: { width: `${100 / 7}%`, fontSize: 9, textAlign: 'center', paddingVertical: 10, color: '#60718e', fontFamily: fonts.sansBold },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, minHeight: 78, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 7, paddingHorizontal: 5 },
  day: { fontSize: 13, fontFamily: fonts.sansBold },
  paid: { color: '#1762bb', fontSize: 10, marginTop: 9, fontFamily: fonts.sansBold },
  count: { fontSize: 8, color: '#8390a4', marginTop: 3, fontFamily: fonts.sans },
});
