# 기술 사양 문서 (Technical Specifications - 3D Pivot)

## 1. 기술 스택 (The 3D Web Stack)
- **프론트엔드**: Next.js (App Router), TypeScript
- **3D 렌더링**: `React Three Fiber` (@react-three/fiber), `Three.js`
- **3D 유틸리티**: `@react-three/drei`
- **물리 엔진**: `@react-three/rapier` (WASM 기반 고성능 물리)
- **상태 관리**: `Zustand` (게임 엔진과의 결합도 우수)
- **백엔드**: Supabase (Realtime, Edge Functions)

## 2. 3D 엔진 아키텍처
### [Scene Manager]
- 전역 캔버스(`Canvas`)는 루트 레이아웃 또는 메인 페이지에 배치.
- `Zustand` 스토어로 3D 공간 내의 카드, 칩 정보를 관리하고 각 `Mesh`가 이를 구독하여 변화 감지.

### [Physics Integration]
- 테이블과 칩을 `RigidBody`로 설정하여 중력 및 충돌 처리.
- 칩 투척 시 초기 속도(`Impulse`)와 회전(`Torque`)을 계산하여 발사.

### [Optimization]
- **Instanced Mesh**: 수천 개의 칩을 효율적으로 렌더링하기 위해 인스턴싱 기법 사용.
- **Texture Compression**: `.webp` 또는 압축된 카드 텍스처 사용.

## 3. 데이터베이스 연동
- 기존 스키마를 그대로 유지하되, `slot_index`를 3D 공간의 특정 `Vector3` 좌표와 매핑.
- Realtime 메시지를 받으면 3D 물체에 애니메이션(카메라 이동, 카드 뒤집기) 트리거.
