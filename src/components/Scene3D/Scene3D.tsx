'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import Table3D from '../Table/Table3D';

const Scene3D: React.FC = () => {
    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[0, 8, 10]} fov={50} />
                <OrbitControls
                    maxPolarAngle={Math.PI / 2.1}
                    minDistance={5}
                    maxDistance={20}
                    enablePan={false}
                />

                {/* Noir Lighting Setup */}
                <color attach="background" args={['#000']} />
                <ambientLight intensity={0.2} />
                <spotLight
                    position={[0, 15, 0]}
                    angle={0.4}
                    penumbra={1}
                    intensity={500}
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

                        {/* Physics Test Object: Falling Cube */}
                        <RigidBody position={[0, 5, 0]} restitution={0.7}>
                            <mesh castShadow>
                                <boxGeometry args={[0.5, 0.5, 0.5]} />
                                <meshStandardMaterial color="orange" />
                            </mesh>
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
