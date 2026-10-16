import { Image, StyleSheet, Text, View } from 'react-native';

import { fonts } from '../theme';

const LOGO = require('../../assets/logo.jpg');

// Logo with the "Bubblebee / Laundry Shop" lockup used on every blue header.
export default function Brand({ size = 40, nameSize = 19, subColor = 'rgba(255,255,255,.8)', gap = 10 }) {
  return (
    <View style={[s.row, { gap }]}>
      <Image source={LOGO} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel="Bubblebee Laundry Shop" />
      <View>
        <Text style={[s.name, { fontSize: nameSize }]}>Bubblebee</Text>
        <Text style={[s.sub, { color: subColor }]}>Laundry Shop</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontFamily: fonts.display, lineHeight: undefined },
  sub: { fontSize: 11, fontFamily: fonts.sans, letterSpacing: 0.9 },
});
