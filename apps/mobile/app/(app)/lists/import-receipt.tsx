import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createList, createListItem, fetchLists } from '@/api/lists';
import { fetchReceipt, uploadReceiptImage } from '@/api/receipts';
import { CenteredLoading } from '@/components/ui/CenteredLoading';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { colors, radius, spacing, touchTargetMin } from '@/constants/theme';
import type { GroceryList } from '@/types/lists';
import type { ReceiptItemPublic, ReceiptPublic } from '@/types/receipts';
import { formatApiErrorMessage } from '@/utils/apiMessage';

type Step = 'source' | 'uploading' | 'review';

type EditableLine = {
  key: number;
  itemId: number;
  included: boolean;
  name: string;
  initialName: string;
  quantity: string;
  canonical_product_id: number | null;
};

function toEditableLines(items: ReceiptItemPublic[]): EditableLine[] {
  return items.map((it) => {
    const initial = (it.free_text?.trim() || it.raw_text).trim();
    return {
      key: it.id,
      itemId: it.id,
      included: true,
      name: initial,
      initialName: initial,
      quantity: it.quantity?.trim() ? it.quantity.trim() : '1',
      canonical_product_id: it.canonical_product_id,
    };
  });
}

export default function ImportReceiptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('source');
  const [receipt, setReceipt] = useState<ReceiptPublic | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [destinationMode, setDestinationMode] = useState<'new' | 'existing'>('new');
  const [newListName, setNewListName] = useState(() => {
    const d = new Date();
    return `Receipt ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  });
  const [existingListId, setExistingListId] = useState<number | null>(null);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [listsLoading, setListsLoading] = useState(false);
  const [listsLoadError, setListsLoadError] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    setListsLoading(true);
    setListsLoadError(null);
    try {
      const data = await fetchLists();
      setLists(data);
      setExistingListId((prev) => (prev == null && data.length > 0 ? data[0]!.id : prev));
    } catch (e) {
      setListsLoadError(formatApiErrorMessage(e));
    } finally {
      setListsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'review') {
      void loadLists();
    }
  }, [step, loadLists]);

  const selectedListName = useMemo(() => {
    if (existingListId == null) {
      return 'Choose list';
    }
    return lists.find((l) => l.id === existingListId)?.name ?? 'Choose list';
  }, [lists, existingListId]);

  const includedCount = useMemo(() => lines.filter((l) => l.included && l.name.trim()).length, [lines]);

  async function handleAsset(asset: ImagePicker.ImagePickerAsset) {
    const uri = asset.uri;
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const fileName =
      asset.fileName ?? `receipt-${Date.now()}.${mimeType.includes('png') ? 'png' : 'jpg'}`;

    setStep('uploading');
    try {
      const uploaded = await uploadReceiptImage({ uri, mimeType, fileName });
      const detail = await fetchReceipt(uploaded.receipt.id);
      setReceipt(detail.receipt);
      setLines(toEditableLines(detail.items));
      setStep('review');
    } catch (e) {
      setStep('source');
      Alert.alert('Upload failed', formatApiErrorMessage(e));
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Camera',
        'Camera access is needed to photograph a receipt.',
        [{ text: 'OK' }],
      );
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.88,
    });
    if (!res.canceled && res.assets[0]) {
      void handleAsset(res.assets[0]);
    }
  }

  async function chooseFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Photos',
        'Photo library access is needed to pick a receipt image.',
        [{ text: 'OK' }],
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.88,
    });
    if (!res.canceled && res.assets[0]) {
      void handleAsset(res.assets[0]);
    }
  }

  function updateLine(itemId: number, patch: Partial<EditableLine>) {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));
  }

  async function submitToList() {
    const included = lines.filter((l) => l.included && l.name.trim());
    if (included.length === 0) {
      Alert.alert('Nothing to add', 'Include at least one item with a name.');
      return;
    }
    if (destinationMode === 'new' && !newListName.trim()) {
      Alert.alert('List name', 'Enter a name for the new list.');
      return;
    }
    if (destinationMode === 'existing' && (lists.length === 0 || existingListId == null)) {
      Alert.alert('Choose a list', 'Select which list to add items to, or create a new list.');
      return;
    }

    setSubmitting(true);
    try {
      let targetListId: number;
      if (destinationMode === 'new') {
        const name = newListName.trim();
        const list = await createList(name);
        targetListId = list.id;
      } else {
        targetListId = existingListId!;
      }

      for (const row of included) {
        const nameTrim = row.name.trim();
        const qtyTrim = row.quantity.trim();
        const quantity = qtyTrim.length > 0 ? qtyTrim : undefined;
        const pid = row.canonical_product_id;
        const useCanonical = pid != null && nameTrim === row.initialName.trim();
        if (useCanonical) {
          await createListItem(targetListId, {
            canonical_product_id: pid,
            ...(quantity !== undefined ? { quantity } : {}),
          });
        } else {
          await createListItem(targetListId, {
            free_text: nameTrim,
            ...(quantity !== undefined ? { quantity } : {}),
          });
        }
      }

      router.replace(`/lists/${targetListId}`);
    } catch (e) {
      Alert.alert('Could not add items', formatApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Close"
              hitSlop={12}
              onPress={() => router.back()}
              style={styles.headerBtn}
            >
              <Text style={styles.headerBtnLabel}>Close</Text>
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {step === 'source' ? (
          <View style={[styles.sourceBody, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <Text style={styles.sourceTitle}>Add items from a receipt</Text>
            <Text style={styles.sourceCopy}>
              Take a clear photo or choose an existing image. We&apos;ll suggest line items you can
              edit before adding to a list.
            </Text>
            <View style={styles.sourceActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void takePhoto()}
                style={({ pressed }) => [styles.primaryPressable, pressed && styles.primaryPressablePressed]}
              >
                <View style={styles.btnRow}>
                  <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.btnRowLabel}>Take photo</Text>
                </View>
              </Pressable>
              <View style={{ height: spacing.md }} />
              <Pressable
                accessibilityRole="button"
                onPress={() => void chooseFromLibrary()}
                style={({ pressed }) => [
                  styles.secondaryOutlinePressable,
                  pressed && styles.secondaryOutlinePressed,
                ]}
              >
                <View style={styles.btnRow}>
                  <Ionicons name="images-outline" size={22} color={colors.systemBlue} />
                  <Text style={styles.secondaryOutlineLabel}>Choose from library</Text>
                </View>
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === 'uploading' ? (
          <CenteredLoading accessibilityLabel="Uploading receipt" message="Uploading and reading receipt…" />
        ) : null}

        {step === 'review' && receipt ? (
          <ScrollView
            contentContainerStyle={[
              styles.reviewScroll,
              { paddingBottom: Math.max(insets.bottom, spacing.xl) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.reviewIntro}>
              Review detected lines. Turn off items you don&apos;t want, then choose where to add them.
            </Text>

            {listsLoadError ? (
              <View style={styles.reviewBannerWrap}>
                <ErrorBanner message={listsLoadError} onRetry={() => void loadLists()} />
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Items</Text>
              {lines.map((line) => (
                <View
                  key={line.key}
                  style={[styles.lineRow, !line.included && styles.lineRowDimmed]}
                >
                  <View style={styles.lineInclude}>
                    <Switch
                      accessibilityLabel={`Include ${line.name || 'item'}`}
                      ios_backgroundColor={colors.systemGray6}
                      onValueChange={(v) => updateLine(line.itemId, { included: v })}
                      trackColor={{ false: colors.systemGray6, true: '#34C759' }}
                      value={line.included}
                    />
                  </View>
                  <View style={styles.lineFields}>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <TextInput
                      editable={line.included}
                      onChangeText={(t) => updateLine(line.itemId, { name: t })}
                      placeholder="Item name"
                      placeholderTextColor={colors.tertiaryLabel}
                      style={styles.lineInput}
                      value={line.name}
                    />
                    <Text style={styles.fieldLabel}>Quantity</Text>
                    <TextInput
                      editable={line.included}
                      keyboardType="default"
                      onChangeText={(t) => updateLine(line.itemId, { quantity: t })}
                      placeholder="1"
                      placeholderTextColor={colors.tertiaryLabel}
                      style={styles.qtyInput}
                      value={line.quantity}
                    />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add to</Text>
              <View style={styles.segment}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDestinationMode('new')}
                  style={[
                    styles.segmentCell,
                    destinationMode === 'new' && styles.segmentCellActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      destinationMode === 'new' && styles.segmentLabelActive,
                    ]}
                  >
                    New list
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDestinationMode('existing')}
                  style={[
                    styles.segmentCell,
                    destinationMode === 'existing' && styles.segmentCellActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      destinationMode === 'existing' && styles.segmentLabelActive,
                    ]}
                  >
                    Existing list
                  </Text>
                </Pressable>
              </View>

              {destinationMode === 'new' ? (
                <>
                  <Text style={styles.fieldLabel}>List name</Text>
                  <TextInput
                    onChangeText={setNewListName}
                    placeholder="List name"
                    placeholderTextColor={colors.tertiaryLabel}
                    style={styles.lineInput}
                    value={newListName}
                  />
                </>
              ) : lists.length === 0 && !listsLoading ? (
                <Text style={styles.emptyListsHint}>
                  You don&apos;t have any lists yet. Create a new list above, or close and add a list
                  from the Lists tab.
                </Text>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>List</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setListPickerOpen(true)}
                    style={styles.listPickerTrigger}
                  >
                    <Text style={styles.listPickerTriggerText} numberOfLines={1}>
                      {listsLoading ? 'Loading lists…' : selectedListName}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.secondaryLabel} />
                  </Pressable>
                </>
              )}
            </View>

            <PrimaryButton
              disabled={
                submitting ||
                includedCount === 0 ||
                (destinationMode === 'new' && !newListName.trim()) ||
                (destinationMode === 'existing' && (listsLoading || lists.length === 0 || existingListId == null))
              }
              loading={submitting}
              onPress={() => void submitToList()}
            >
              Add {includedCount} {includedCount === 1 ? 'item' : 'items'}
            </PrimaryButton>
          </ScrollView>
        ) : null}
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent
        visible={listPickerOpen}
        onRequestClose={() => setListPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setListPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Choose list</Text>
            <FlatList
              data={lists}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setExistingListId(item.id);
                    setListPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.listPickRow,
                    pressed && styles.listPickRowPressed,
                    item.id === existingListId && styles.listPickRowSelected,
                  ]}
                >
                  <Text style={styles.listPickRowText}>{item.name}</Text>
                  {item.id === existingListId ? (
                    <Ionicons name="checkmark" size={22} color={colors.systemBlue} />
                  ) : null}
                </Pressable>
              )}
              style={{ maxHeight: 320 }}
            />
            <SecondaryButton onPress={() => setListPickerOpen(false)}>Cancel</SecondaryButton>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
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
  sourceBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sourceTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.label,
    marginBottom: spacing.sm,
  },
  sourceCopy: {
    fontSize: 16,
    color: colors.secondaryLabel,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  sourceActions: {
    marginTop: spacing.md,
  },
  primaryPressable: {
    minHeight: touchTargetMin,
    borderRadius: radius.md,
    backgroundColor: colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryPressablePressed: {
    opacity: 0.88,
  },
  secondaryOutlinePressable: {
    minHeight: touchTargetMin,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryOutlinePressed: {
    opacity: 0.75,
  },
  secondaryOutlineLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.systemBlue,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  btnRowLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewBannerWrap: {
    marginBottom: spacing.md,
  },
  reviewScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  reviewIntro: {
    fontSize: 15,
    color: colors.secondaryLabel,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: spacing.md,
  },
  lineRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    paddingBottom: spacing.md,
  },
  lineRowDimmed: {
    opacity: 0.45,
  },
  lineInclude: {
    justifyContent: 'flex-start',
    paddingTop: 4,
    marginRight: spacing.sm,
  },
  lineFields: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondaryLabel,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  lineInput: {
    minHeight: 44,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    backgroundColor: colors.systemGray6,
    color: colors.label,
    marginBottom: spacing.sm,
  },
  qtyInput: {
    minHeight: 44,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    backgroundColor: colors.systemGray6,
    color: colors.label,
    maxWidth: 120,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.systemGray6,
    borderRadius: radius.sm,
    padding: 3,
    marginBottom: spacing.md,
  },
  segmentCell: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm - 2,
  },
  segmentCellActive: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.secondaryLabel,
  },
  segmentLabelActive: {
    color: colors.label,
    fontWeight: '600',
  },
  listPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.systemGray6,
    borderRadius: radius.sm,
  },
  listPickerTriggerText: {
    flex: 1,
    fontSize: 17,
    color: colors.label,
    marginRight: spacing.sm,
  },
  emptyListsHint: {
    fontSize: 15,
    color: colors.secondaryLabel,
    lineHeight: 21,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.label,
  },
  listPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTargetMin,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  listPickRowPressed: {
    opacity: 0.7,
  },
  listPickRowSelected: {
    backgroundColor: colors.systemGray6,
    borderRadius: radius.sm,
  },
  listPickRowText: {
    flex: 1,
    fontSize: 17,
    color: colors.label,
  },
});
