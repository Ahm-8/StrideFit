import { PixelRatio } from 'react-native';

export const scaleFontSize = (size) => {
  const fontScale = PixelRatio.getFontScale();
  return size * fontScale;
};