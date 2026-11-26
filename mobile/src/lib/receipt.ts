import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '../api/session';

// The receipt route needs the bearer token, so the PDF is fetched through the
// api client, saved to the cache and handed to the system share sheet.
// Returns false where that isn't possible (web).
export async function openReceipt(feeId: string): Promise<boolean> {
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) return false;
  const bytes = await api.getBytes(`/fees/${feeId}/receipt`);
  const file = new File(Paths.cache, `receipt-${feeId.slice(0, 8)}.pdf`);
  file.create({ overwrite: true });
  file.write(new Uint8Array(bytes));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Fee receipt' });
  return true;
}
