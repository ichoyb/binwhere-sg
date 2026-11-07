import { StyleSheet, View } from 'react-native';
import { dark } from '../theme/dark';

export function MapIcon({ name, accent = false }: {
  name: 'search' | 'camera' | 'layers' | 'locate'; accent?: boolean;
}) {
  const color = accent ? dark.onAccent : dark.text;
  return (
    <View style={styles.box} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {name === 'camera' ? <>
        <View style={[styles.camera, { borderColor: color }]} />
        <View style={[styles.lens, { borderColor: color }]} />
        <View style={[styles.cameraTop, { backgroundColor: color }]} />
      </> : name === 'search' ? <>
        <View style={[styles.search, { borderColor: color }]} />
        <View style={[styles.stem, { backgroundColor: color }]} />
      </> : name === 'locate' ? <>
        <View style={[styles.target, { borderColor: color }]} />
        <View style={[styles.targetDot, { backgroundColor: color }]} />
        <View style={[styles.crossVertical, { backgroundColor: color }]} />
        <View style={[styles.crossHorizontal, { backgroundColor: color }]} />
        <View style={[styles.crossVertical, styles.crossBottom, { backgroundColor: color }]} />
        <View style={[styles.crossHorizontal, styles.crossLeft, { backgroundColor: color }]} />
      </> : <>
        {[4, 10, 16].map((top) => <View key={top} style={[styles.layer, { top, borderColor: color }]} />)}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: 28, height: 28 },
  camera: { position: 'absolute', left: 1, top: 6, width: 26, height: 19, borderWidth: 2, borderRadius: 5 },
  lens: { position: 'absolute', left: 9, top: 10, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  cameraTop: { position: 'absolute', left: 9, top: 3, width: 10, height: 4, borderRadius: 2 },
  search: { position: 'absolute', left: 2, top: 2, width: 18, height: 18, borderWidth: 2, borderRadius: 9 },
  stem: { position: 'absolute', left: 20, top: 17, width: 2, height: 10, transform: [{ rotate: '-45deg' }] },
  target: { position: 'absolute', left: 5, top: 5, width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  targetDot: { position: 'absolute', left: 11, top: 11, width: 6, height: 6, borderRadius: 3 },
  crossVertical: { position: 'absolute', left: 13, top: 0, width: 2, height: 5 },
  crossHorizontal: { position: 'absolute', left: 23, top: 13, width: 5, height: 2 },
  crossBottom: { top: 23 },
  crossLeft: { left: 0 },
  layer: { position: 'absolute', left: 5, width: 18, height: 9, borderWidth: 1.5, borderRadius: 2,
    transform: [{ rotate: '-25deg' }, { skewX: '30deg' }] },
});
