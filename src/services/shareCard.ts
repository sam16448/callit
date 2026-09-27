import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { shareText } from '@/lib/share';
import type { RunRecord } from '@/state/runs';

/**
 * Shares a run: the share card as a 1080×1350 image where the phone can share
 * files, otherwise (or if capturing fails) the Wordle-style text.
 */
export async function shareRun(record: RunRecord, boardName: string, card?: RefObject<View | null>): Promise<void> {
  const text = shareText(record, boardName);
  try {
    if (card?.current && Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
      const uri = await captureRef(card, { format: 'png', result: 'tmpfile', width: 1080, height: 1350 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your run' });
      return;
    }
  } catch {
    // Fall through to the text version.
  }
  try {
    await Share.share({ message: text });
  } catch {
    // Share sheet closed or not available.
  }
}
