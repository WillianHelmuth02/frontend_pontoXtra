import { Modal, ScrollView, StyleSheet, View, type ModalProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AppModal(props: ModalProps) {
  return <Modal supportedOrientations={['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right']} {...props}>
    <SafeAreaView style={styles.safe}>{props.children}</SafeAreaView>
  </Modal>;
}

export function Dialog({ children, ...props }: ModalProps) {
  return <AppModal transparent animationType="fade" {...props}>
    <View style={styles.overlay}>
      <View accessibilityViewIsModal style={styles.panel}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {children}
        </ScrollView>
      </View>
    </View>
  </AppModal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#001B4266' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  panel: { width: '100%', maxWidth: 600, maxHeight: '100%', borderRadius: 16, backgroundColor: '#FFFFFF' },
  content: { padding: 20, gap: 12 },
});
