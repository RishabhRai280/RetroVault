import type { CasingTheme } from '@retrovault/db';

export const getCasingStyles = (casing: CasingTheme): React.CSSProperties => {
  if (casing.type === 'solid') {
    return { backgroundColor: casing.solidColor };
  }
  if (casing.type === 'gradient') {
    return { backgroundImage: `linear-gradient(${casing.gradient.direction}, ${casing.gradient.colorFrom}, ${casing.gradient.colorTo})` };
  }
  if (casing.type === 'image' && casing.imageUrl) {
    return {
      backgroundImage: `url(${casing.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return {}; // classic handles by CSS classes
};

export const getCasingClasses = (casing: CasingTheme): string => {
  if (casing.type === 'classic') {
    if (casing.classicId === 'atomic-purple') return 'casing-atomic-purple text-[#ffd0ff]';
    if (casing.classicId === 'clear') return 'casing-clear text-[#333]';
    if (casing.classicId === 'yellow') return 'casing-yellow text-[#555]';
    return 'bg-gradient-to-br from-[#f2f2f0] to-[#cdc9b8]'; // plastic-gray
  }
  return 'text-[#fff] border-white/20'; // Base classes for custom dark colors
};
