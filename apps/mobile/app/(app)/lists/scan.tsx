import { Ionicons } from '@expo/vector-icons';
import type { BarcodeScanningResult } from 'expo-camera';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createListItem } from '@/api/lists';
import { isApiError } from '@/api/errors';
import { fetchProductByBarcode } from '@/api/products';
import { CenteredError } from '@/components/ui/CenteredError';
import { CenteredLoading } from '@/components/ui/CenteredLoading';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors, radius, spacing, touchTargetMin } from '@/constants/theme';
import { formatApiErrorMessage } from '@/utils/apiMessage';

/** Ignore duplicate reads of the same code for this long (ms). */
const SAME_CODE_COOLDOWN_MS = 2500;
/** Minimum time between starting any two lookups (ms). */
const BETWEEN_SCANS_MS = 900;

function releaseScanGate(
  setFreeze: (v: boolean) => void,
  busy: { current: boolean },
) {
  busy.current = false;
  setFreeze(false);
}

const BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'itf14',
  'qr',
] as const;

export default function BarcodeScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listId: listIdParam } = useLocalSearchParams<{ listId: string }>();
  const listId = Number(listIdParam);

  const [permission, requestPermission] = useCameraPermissions();
  const [manualMode, setManualMode] = useState(false);
  const [freezeCamera, setFreezeCamera] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [manualText, setManualText] = useState('');
  const [adding, setAdding] = useState(false);

  const busyRef = useRef(false);
  const lastCodeRef = useRef<string>('');
  const lastCodeAtRef = useRef(0);
  const lastLookupAtRef = useRef(0);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const resetManual = useCallback(() => {
    setManualMode(false);
    setScannedCode('');
    setManualText('');
    releaseScanGate(setFreezeCamera, busyRef);
  }, []);

  const runLookup = useCallback(
    async (raw: string) => {
      try {
        const product = await fetchProductByBarcode(raw);
        Alert.alert(
          'Add to list?',
          product.display_name,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => releaseScanGate(setFreezeCamera, busyRef),
            },
            {
              text: 'Add',
              onPress: () => {
                void (async () => {
                  try {
                    await createListItem(listId, { canonical_product_id: product.id });
                    router.back();
                  } catch (e) {
                    Alert.alert('Could not add item', formatApiErrorMessage(e));
                    releaseScanGate(setFreezeCamera, busyRef);
                  }
                })();
              },
            },
          ],
          {
            cancelable: true,
            onDismiss: () => releaseScanGate(setFreezeCamera, busyRef),
          },
        );
      } catch (e) {
        if (isApiError(e) && (e.statusCode === 404 || e.code === 'BARCODE_NOT_FOUND')) {
          setScannedCode(raw);
          setManualText('');
          setManualMode(true);
          releaseScanGate(setFreezeCamera, busyRef);
        } else {
          Alert.alert('Lookup failed', formatApiErrorMessage(e), [
            {
              text: 'OK',
              onPress: () => releaseScanGate(setFreezeCamera, busyRef),
            },
          ]);
        }
      }
    },
    [listId, router],
  );

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (manualMode || freezeCamera) {
        return;
      }
      const data = result.data?.trim() ?? '';
      if (!data) {
        return;
      }
      if (busyRef.current) {
        return;
      }
      const now = Date.now();
      if (now - lastLookupAtRef.current < BETWEEN_SCANS_MS) {
        return;
      }
      if (
        data === lastCodeRef.current &&
        now - lastCodeAtRef.current < SAME_CODE_COOLDOWN_MS
      ) {
        return;
      }

      lastLookupAtRef.current = now;
      lastCodeRef.current = data;
      lastCodeAtRef.current = now;

      busyRef.current = true;
      setFreezeCamera(true);
      void runLookup(data);
    },
    [freezeCamera, manualMode, runLookup],
  );

  const addManualItem = useCallback(async () => {
    const text = manualText.trim();
    if (!text) {
      return;
    }
    setAdding(true);
    try {
      await createListItem(listId, { free_text: text });
      router.back();
    } catch (e) {
      Alert.alert('Could not add item', formatApiErrorMessage(e));
    } finally {
      setAdding(false);
    }
  }, [listId, manualText, router]);

  const invalidList = !Number.isInteger(listId) || listId < 1;

  if (invalidList) {
    return (
      <>
        <Stack.Screen
          options={{
            headerLeft: () => (
              <Pressable
                accessibilityLabel="Close"
                hitSlop={12}
                onPress={handleClose}
                style={styles.headerBtn}
              >
                <Text style={styles.headerBtnLabel}>Close</Text>
              </Pressable>
            ),
          }}
        />
        <CenteredError message="This list does not exist or the link is invalid." onRetry={handleClose} retryLabel="Close" />
      </>
    );
  }

  if (!permission) {
    return (
      <>
        <Stack.Screen
          options={{
            headerLeft: () => (
              <Pressable
                accessibilityLabel="Cancel"
                hitSlop={12}
                onPress={handleClose}
                style={styles.headerBtn}
              >
                <Text style={styles.headerBtnLabel}>Cancel</Text>
              </Pressable>
            ),
          }}
        />
        <CenteredLoading accessibilityLabel="Checking camera" message="Checking camera…" />
      </>
    );
  }

  if (!permission.granted) {
    return (
      <>
        <Stack.Screen
          options={{
            headerLeft: () => (
              <Pressable
                accessibilityLabel="Cancel"
                hitSlop={12}
                onPress={handleClose}
                style={styles.headerBtn}
              >
                <Text style={styles.headerBtnLabel}>Cancel</Text>
              </Pressable>
            ),
          }}
        />
        <View style={styles.permissionBody}>
          <Ionicons name="camera-outline" size={48} color={colors.secondaryLabel} />
          <Text style={styles.permissionTitle}>Camera access</Text>
          <Text style={styles.permissionCopy}>
            CartScout needs the camera to read product barcodes. You can still add items as plain
            text from the list screen.
          </Text>
          <View style={styles.permissionActions}>
            <PrimaryButton onPress={() => void requestPermission()}>Allow camera</PrimaryButton>
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openSettings()}
              style={styles.settingsLink}
            >
              <Text style={styles.settingsLinkText}>Open Settings</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Cancel"
              hitSlop={12}
              onPress={handleClose}
              style={styles.headerBtn}
            >
              <Text style={styles.headerBtnLabel}>Cancel</Text>
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {!manualMode ? (
          <View style={styles.cameraWrap}>
            <CameraView
              active={!manualMode && !freezeCamera}
              barcodeScannerSettings={{
                barcodeTypes: [...BARCODE_TYPES],
              }}
              facing="back"
              onBarcodeScanned={onBarcodeScanned}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.scanFrame} pointerEvents="none">
              <View style={styles.scanFrameCorner} />
            </View>
            <View style={[styles.hintBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <Text style={styles.hintTitle}>Scan a product barcode</Text>
              <Text style={styles.hintSub}>Hold steady — we ignore repeat reads for a moment.</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.manualWrap, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.manualCard}>
              <Text style={styles.manualTitle}>No catalog match</Text>
              <Text style={styles.manualCopy}>
                We don&apos;t recognize barcode{' '}
                <Text style={styles.manualCode}>{scannedCode}</Text>. Add a custom line or try
                another scan.
              </Text>
              <Text style={styles.inputLabel}>Item name</Text>
              <TextInput
                autoCapitalize="sentences"
                autoCorrect
                onChangeText={setManualText}
                placeholder="e.g. Organic oats"
                placeholderTextColor={colors.tertiaryLabel}
                returnKeyType="done"
                style={styles.input}
                value={manualText}
              />
              <View style={styles.manualButtons}>
                <PrimaryButton loading={adding} onPress={() => void addManualItem()}>
                  Add to list
                </PrimaryButton>
                <Pressable
                  accessibilityRole="button"
                  onPress={resetManual}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
                >
                  <Text style={styles.secondaryBtnLabel}>Scan again</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    minWidth: touchTargetMin,
    justifyContent: 'center',
  },
  headerBtnLabel: {
    fontSize: 17,
    color: colors.systemBlue,
  },
  permissionBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.groupedBackground,
    gap: spacing.md,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.label,
    textAlign: 'center',
  },
  permissionCopy: {
    fontSize: 16,
    color: colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  permissionActions: {
    marginTop: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 320,
  },
  settingsLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingsLinkText: {
    fontSize: 17,
    color: colors.systemBlue,
  },
  cameraWrap: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrameCorner: {
    width: '72%',
    maxWidth: 300,
    aspectRatio: 1.4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  hintBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  hintTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  hintSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 19,
  },
  manualWrap: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    justifyContent: 'flex-start',
  },
  manualCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.label,
    marginBottom: spacing.sm,
  },
  manualCopy: {
    fontSize: 16,
    color: colors.secondaryLabel,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  manualCode: {
    fontWeight: '600',
    color: colors.label,
    fontVariant: ['tabular-nums'],
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondaryLabel,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    backgroundColor: colors.systemGray6,
    color: colors.label,
    marginBottom: spacing.lg,
  },
  manualButtons: {
    gap: spacing.sm,
  },
  secondaryBtn: {
    minHeight: touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryBtnPressed: {
    opacity: 0.55,
  },
  secondaryBtnLabel: {
    fontSize: 17,
    color: colors.systemBlue,
  },
});
