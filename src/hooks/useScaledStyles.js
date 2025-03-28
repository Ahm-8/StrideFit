import { useMemo } from 'react';
import { useFontSize } from '../context/FontSizeContext';

export const useScaledStyles = (styleCreator) => {
  const { fontSize } = useFontSize();

  return useMemo(() => {
    const baseStyles = styleCreator();
    const scaledStyles = {};

    Object.keys(baseStyles).forEach(key => {
      scaledStyles[key] = { ...baseStyles[key] };
      if (baseStyles[key].fontSize) {
        scaledStyles[key].fontSize = getScaledFontSize(baseStyles[key].fontSize, fontSize);
      }
    });

    return scaledStyles;
  }, [fontSize]);
};

const getScaledFontSize = (baseSize, fontSizePreference) => {
  switch (fontSizePreference) {
    case 'small':
      return baseSize * 0.8;
    case 'large':
      return baseSize * 1.2;
    default:
      return baseSize;
  }
};