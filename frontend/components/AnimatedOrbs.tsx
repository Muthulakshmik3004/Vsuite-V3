import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface AnimatedOrbsProps {
    count?: number;
}

const AnimatedOrbs: React.FC<AnimatedOrbsProps> = ({ count = 15 }) => {
    const orbs = useRef(
        Array.from({ length: count }, () => ({
            x: new Animated.Value(Math.random() * width),
            y: new Animated.Value(Math.random() * height),
            scale: new Animated.Value(Math.random() * 0.5 + 0.5),
            opacity: new Animated.Value(Math.random() * 0.3 + 0.1),
        }))
    ).current;

    useEffect(() => {
        orbs.forEach((orb, index) => {
            const animateOrb = () => {
                const duration = Math.random() * 8000 + 4000; // 4-12 seconds

                Animated.parallel([
                    Animated.timing(orb.x, {
                        toValue: Math.random() * width,
                        duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(orb.y, {
                        toValue: Math.random() * height,
                        duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(orb.scale, {
                        toValue: Math.random() * 0.5 + 0.5,
                        duration: duration / 2,
                        useNativeDriver: true,
                    }),
                    Animated.timing(orb.opacity, {
                        toValue: Math.random() * 0.3 + 0.1,
                        duration: duration / 2,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    // Loop animation
                    setTimeout(animateOrb, Math.random() * 3000);
                });
            };

            setTimeout(animateOrb, Math.random() * 2000); // 0-2 seconds delay
        });
    }, [orbs]);

    return (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {orbs.map((orb, index) => (
                <Animated.View
                    key={index}
                    style={{
                        position: 'absolute',
                        width: 60 + Math.random() * 40, // 60-100px
                        height: 60 + Math.random() * 40,
                        borderRadius: 30 + Math.random() * 20,
                        backgroundColor: `rgba(255, 255, 255, ${Math.random() * 0.1 + 0.05})`,
                        transform: [
                            { translateX: orb.x },
                            { translateY: orb.y },
                            { scale: orb.scale },
                        ],
                        opacity: orb.opacity,
                    }}
                />
            ))}
        </View>
    );
};

export default AnimatedOrbs;
