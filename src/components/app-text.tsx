import type { ComponentProps } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, type StyleProp, type TextStyle } from 'react-native';
import { fontSizes, useFontSize } from '@/contexts/font-size';

function useScaledStyle(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const { size } = useFontSize();
  const scale = fontSizes[size];
  if (scale === 1) return style;

  const { fontSize = 14, lineHeight } = StyleSheet.flatten(style) ?? {};
  return [style, {
    fontSize: Math.round(fontSize * scale),
    lineHeight: lineHeight === undefined ? undefined : Math.round(lineHeight * scale),
  }];
}

export function Text({ style, ...props }: ComponentProps<typeof NativeText>) {
  const scaledStyle = useScaledStyle(style);
  return <NativeText {...props} style={scaledStyle} />;
}

export function TextInput({ style, ...props }: ComponentProps<typeof NativeTextInput>) {
  const scaledStyle = useScaledStyle(style);
  return <NativeTextInput {...props} style={scaledStyle} />;
}
