import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { t, type Locale } from '@binwhere/core';
import { reportError } from '../lib/reporting';
import { radii, spacing, touch } from '../theme/colors';
import { dark } from '../theme/dark';
import { announce } from '../lib/accessibility';

interface Props {
  locale: Locale;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence for render-time errors.
 *
 * Without a boundary React Native unmounts the whole tree and the user is
 * left on a blank screen with no way back. This one reports the error and
 * offers a remount: everything below is rebuilt from storage, so history and
 * language survive while the broken screen state is discarded.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportError(error, { componentStack: info.componentStack ?? undefined });
    announce(`${t(this.props.locale, 'error.crashTitle')}, ${t(this.props.locale, 'error.crashBody')}`);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    const { locale } = this.props;
    return (
      <ScrollView alwaysBounceVertical={false} style={{ backgroundColor: dark.background }} contentContainerStyle={styles.root}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={2}>{t(locale, 'error.crashTitle')}</Text>
        <Text style={styles.body}>{t(locale, 'error.crashBody')}</Text>
        <Pressable onPress={this.reset} style={styles.button} accessibilityRole="button" accessibilityLabel={t(locale, 'error.crashRetry')}>
          <Text style={styles.buttonText}>{t(locale, 'error.crashRetry')}</Text>
        </Pressable>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    backgroundColor: dark.background,
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: '700', color: dark.text, marginBottom: spacing.sm },
  body: { fontSize: 16, lineHeight: 24, color: dark.muted, marginBottom: spacing.lg },
  button: {
    minHeight: touch.minHeight,
    backgroundColor: dark.accent,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: dark.onAccent, fontSize: 16, fontWeight: '700' },
});
