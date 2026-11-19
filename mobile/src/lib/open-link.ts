import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { dark } from '../theme/dark';
import { linkTarget } from './link-target';

let browserOpen = false;

export async function openLink(url: string): Promise<void> {
  if (linkTarget(url) === 'system') {
    await Linking.openURL(url);
    return;
  }
  if (browserOpen) return;
  browserOpen = true;
  try {
    await WebBrowser.openBrowserAsync(url, { controlsColor: dark.accent });
  } finally {
    browserOpen = false;
  }
}
