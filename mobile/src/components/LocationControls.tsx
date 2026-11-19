import { Linking, Pressable, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useRef, type ComponentRef, type Ref } from 'react';
import { t, type Locale, type PlanningArea } from '@binwhere/core';
import { locationFailureNotice, type LocationFailure } from '../lib/location-source';
import { reportError } from '../lib/reporting';

interface ButtonStyles { buttonStyle: StyleProp<ViewStyle>; textStyle: StyleProp<TextStyle> }

export function LocationFailureActions({ reason, locale, onRetry, onChooseArea, retryKey, buttonStyle, textStyle }: ButtonStyles & {
  reason: LocationFailure; locale: Locale; onRetry: () => void; onChooseArea: (trigger: ComponentRef<typeof Pressable> | null) => void;
  retryKey: 'shared.tryAgain' | 'map.retry';
}) {
  const areaButton = useRef<ComponentRef<typeof Pressable>>(null);
  return locationFailureNotice(reason).actions.map((action) => {
    const label = t(locale, action === 'settings' ? 'location.openSettings'
      : action === 'retry' ? retryKey : 'location.chooseArea');
    return <Pressable key={action} ref={action === 'area' ? areaButton : undefined} accessibilityRole="button" accessibilityLabel={label} style={buttonStyle}
      onPress={action === 'settings' ? () => void Linking.openSettings()
        .catch((error) => reportError(error, { operation: 'open-location-settings' }))
        : action === 'retry' ? onRetry : () => onChooseArea(areaButton.current)}>
      <Text style={textStyle}>{label}</Text>
    </Pressable>;
  });
}

export function AreaControls({ area, locale, onChangeArea, onUseLocation, buttonStyle, textStyle, labelStyle, labelRef }: ButtonStyles & {
  area: PlanningArea; locale: Locale; onChangeArea: (trigger: ComponentRef<typeof Pressable> | null) => void; onUseLocation: () => void;
  labelStyle: StyleProp<TextStyle>;
  labelRef?: Ref<ComponentRef<typeof Text>>;
}) {
  const changeButton = useRef<ComponentRef<typeof Pressable>>(null);
  return <>
    <Text ref={labelRef} accessible style={labelStyle}>{t(locale, 'location.centredOn').replace('{area}', area.names[locale])}</Text>
    <Pressable ref={changeButton} accessibilityRole="button" accessibilityLabel={t(locale, 'location.changeArea')}
      onPress={() => onChangeArea(changeButton.current)} style={buttonStyle}><Text style={textStyle}>{t(locale, 'location.changeArea')}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'location.useMyLocation')}
      onPress={onUseLocation} style={buttonStyle}><Text style={textStyle}>{t(locale, 'location.useMyLocation')}</Text></Pressable>
  </>;
}
