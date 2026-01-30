import React, { useRef, useState } from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CANVAS_WIDTH = width - 80;
const CANVAS_HEIGHT = 200;

interface SignaturePadProps {
  onSignatureChange: (signature: string | null) => void;
  placeholder?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  placeholder = "Sign here"
}) => {
  const [paths, setPaths] = useState<Array<{ path: string; color: string; width: number }>>([]);
  const [currentPath, setCurrentPath] = useState('');
  const svgRef = useRef<any>(null);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const newPath = `M ${locationX} ${locationY}`;
      setCurrentPath(newPath);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const newPath = `${currentPath} L ${locationX} ${locationY}`;
      setCurrentPath(newPath);
    },
    onPanResponderRelease: () => {
      if (currentPath) {
        const newPaths = [...paths, {
          path: currentPath,
          color: '#000000',
          width: 2
        }];
        setPaths(newPaths);
        setCurrentPath('');

        // Convert to base64 after a short delay to ensure rendering
        setTimeout(() => convertToBase64(newPaths), 100);
      }
    },
  });

  const convertToBase64 = async (allPaths: Array<{ path: string; color: string; width: number }>) => {
    try {
      // Create SVG string
      const svgString = `
        <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          ${allPaths.map(pathData =>
            `<path d="${pathData.path}" stroke="${pathData.color}" stroke-width="${pathData.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
          ).join('')}
        </svg>
      `;

      // Convert SVG to base64
      const base64Signature = `data:image/svg+xml;base64,${btoa(svgString)}`;
      onSignatureChange(base64Signature);
    } catch (error) {
      console.error('Error converting signature to base64:', error);
      onSignatureChange(null);
    }
  };

  const clearSignature = () => {
    setPaths([]);
    setCurrentPath('');
    onSignatureChange(null);
  };

  const hasSignature = paths.length > 0 || currentPath.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.signatureContainer}>
        <Svg
          ref={svgRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={styles.canvas}
          {...panResponder.panHandlers}
        >
          {/* Background */}
          <Path d={`M 0 0 L ${CANVAS_WIDTH} 0 L ${CANVAS_WIDTH} ${CANVAS_HEIGHT} L 0 ${CANVAS_HEIGHT} Z`}
                fill="white"
                stroke="#E5E7EB"
                strokeWidth={1} />

          {/* Existing paths */}
          {paths.map((pathData, index) => (
            <Path
              key={index}
              d={pathData.path}
              stroke={pathData.color}
              strokeWidth={pathData.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Current path being drawn */}
          {currentPath && (
            <Path
              d={currentPath}
              stroke="#000000"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Placeholder text */}
          {!hasSignature && (
            <React.Fragment>
              <Path d={`M ${CANVAS_WIDTH/2 - 40} ${CANVAS_HEIGHT/2 + 5} L ${CANVAS_WIDTH/2 + 40} ${CANVAS_HEIGHT/2 + 5} Z`}
                    stroke="#9CA3AF"
                    strokeWidth={1} />
            </React.Fragment>
          )}
        </Svg>

        {!hasSignature && (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>{placeholder}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearSignature}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hintText}>
        Draw your signature above
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  signatureContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  canvas: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  placeholderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontStyle: 'italic',
  },
  clearButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default SignaturePad;