import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

/** Soft market-green wash for auth / hero surfaces. */
export function BrandAtmosphere() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.base} />
      <View style={styles.blobTop} />
      <View style={styles.blobSide} />
      <View style={styles.blobBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.groupedBackground,
  },
  blobTop: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.heroWash,
    opacity: 0.85,
  },
  blobSide: {
    position: 'absolute',
    top: 120,
    right: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.heroWashDeep,
    opacity: 0.45,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -60,
    left: '20%',
    width: 260,
    height: 180,
    borderRadius: 100,
    backgroundColor: colors.heroWash,
    opacity: 0.35,
  },
});
