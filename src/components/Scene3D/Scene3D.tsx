'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import Card3D from '../Card/Card3D';
import Table3D from '../Table/Table3D';

const Scene3D: React.FC = () => {
    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[0, 6, 4]} fov={75} />
                <OrbitControls
                    enableRotate={false}
                    enablePan={false}
                    enableZoom={true}
                    minDistance={2}
                    maxDistance={15}
                    target={[0, 0, 0]} // Center of the table
                />

                {/* Noir Lighting Setup */}
                <color attach="background" args={['#000']} />
                <ambientLight intensity={0.2} />
                <spotLight
                    position={[0, 15, 0]}
                    angle={0.4}
                    penumbra={1}
                    intensity={1000}
                    castShadow
                    shadow-bias={-0.0001}
                />
                <rectAreaLight
                    width={10}
                    height={10}
                    intensity={2}
                    position={[0, 10, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                />

                <Suspense fallback={null}>
                    <Physics debug={false}>
                        <Table3D />

                        {/* Player Hole Cards Test */}
                        <Card3D rank="A" suit="S" position={[-0.6, 0.1, 1.5]} rotation={[-Math.PI / 2.5, 0, 0]} />
                        <Card3D rank="K" suit="H" position={[0.6, 0.1, 1.5]} rotation={[-Math.PI / 2.5, 0, 0]} />

                        {/* Community Cards (Full Board) Test */}
                        <Card3D rank="J" suit="D" position={[-2.2, 0.2, -3]} rotation={[-Math.PI / 2.8, 0, 0]} />
                        <Card3D rank="10" suit="C" position={[-1.1, 0.2, -3]} rotation={[-Math.PI / 2.8, 0, 0]} />
                        <Card3D rank="2" suit="S" position={[0, 0.2, -3]} rotation={[-Math.PI / 2.8, 0, 0]} />
                        <Card3D rank="A" suit="H" position={[1.1, 0.2, -3]} rotation={[-Math.PI / 2.8, 0, 0]} />
                        <Card3D rank="Q" suit="S" position={[2.2, 0.2, -3]} rotation={[-Math.PI / 2.8, 0, 0]} />

                        {/* Physics Test Object: Falling Card */}
                        <RigidBody position={[0, 5, 0]} rotation={[0.5, 0.5, 0.5]}>
                            <Card3D rank="7" suit="D" />
                        </RigidBody>
                    </Physics>

                    <ContactShadows
                        opacity={0.7}
                        scale={15}
                        blur={2}
                        far={10}
                        resolution={256}
                        color="#000000"
                    />
                    <Environment preset="night" />
                </Suspense>
            </Canvas>
        </div>
    );
};

export default Scene3D;
