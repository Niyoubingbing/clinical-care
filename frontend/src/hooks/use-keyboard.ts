import { useEffect, useRef } from 'react';

type KeyMap = Record<string, () => void>;

export function useKeyboard(keyMap: KeyMap) {
  const keyMapRef = useRef(keyMap);
  keyMapRef.current = keyMap;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Build key string (e.g., "mod+k", "mod+1", "mod+shift+l")
      const parts: string[] = [];
      
      if (e.metaKey || e.ctrlKey) {
        parts.push('mod');
      }
      
      if (e.shiftKey) {
        parts.push('shift');
      }
      
      if (e.altKey) {
        parts.push('alt');
      }
      
      // Only add the key if it's not a modifier
      if (!['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) {
        parts.push(e.key.toLowerCase());
      }
      
      const keyString = parts.join('+');
      const callback = keyMapRef.current[keyString];
      
      if (callback) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
