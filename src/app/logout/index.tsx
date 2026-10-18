import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const circles = [
  [-32, 9], [9, 2], [130, -20], [117, 19], [294, -54],
  [331, -41], [321, 56], [310, 109], [46, 106], [160, 86],
  [200, 79], [-25, 162], [5, 190], [327, 217], [366, 227],
  [-57, 282], [53, 299], [366, 334],
];

export default function LogoutScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <View pointerEvents="none" style={styles.header}>
          <View style={styles.pattern}>
            {circles.map(([left, top], index) => (
              <View key={index} style={[styles.circle, { left, top }]} />
            ))}
          </View>
        </View>
        <View style={[styles.logoCard, { marginTop: Math.max(130, insets.top + 70) }]}>
          <Image
            source={require('@/assets/images/Logo/Logo principal.png')}
            contentFit="contain"
            accessibilityLabel="PontoXtra"
            style={styles.logo}
          />
        </View>
        <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 32) }]}>
          <Text style={styles.title}>Logout</Text>
          <Text style={styles.subtitle}>Tem Certeza?</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/login/index')}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Sair</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEEEEE' },
  content: { flexGrow: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 390, backgroundColor: '#005D25', overflow: 'hidden' },
  pattern: { width: 414, height: 390, alignSelf: 'center' },
  circle: { position: 'absolute', width: 73, height: 73, borderRadius: 37, backgroundColor: '#062354' },
  logoCard: { width: 280, height: 280, maxWidth: '90%', alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  logo: { width: '100%', height: '100%' },
  panel: { flex: 1, minHeight: 562, marginTop: -76, paddingTop: 86, paddingHorizontal: 32, backgroundColor: '#EEEEEE', borderTopLeftRadius: 64, borderTopRightRadius: 64, alignItems: 'center' },
  title: { fontSize: 46, lineHeight: 58, fontWeight: '800', letterSpacing: -1.5, color: '#1D2323' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: '#666666' },
  button: { marginTop: 74, width: '100%', maxWidth: 268, height: 47, borderRadius: 8, backgroundColor: '#FF3035', alignItems: 'center', justifyContent: 'center' },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
});
