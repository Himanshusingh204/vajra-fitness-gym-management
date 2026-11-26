import * as Linking from 'expo-linking';
import { SITE_URL } from '../api/session';

// Native checkout is not installed. Hand off to the working website before
// creating an order, so opening this screen never creates an unpayable order.
export async function openCheckout(gymId: string): Promise<void> {
  await Linking.openURL(`${SITE_URL.replace(/\/+$/, '')}/gyms/${encodeURIComponent(gymId)}/plans`);
}
