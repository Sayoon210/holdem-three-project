# Texas Hold'em 3D Web Game Project Plan

이 문서는 3D 공간(React Three Fiber)으로의 전환을 반영한 새로운 마스터 플랜입니다.

## 1. 프로젝트 개요
- **장르**: 실시간 3D 텍사스 홀덤 (No-Limit)
- **플랫폼**: WebGL 기반 웹 게임
- **최대 인원**: 4명 (동, 서, 남, 북 배치)
- **핵심 특징**: 
    - **Immersive View**: 상시 좌석 시점(POV)에서 테이블 중앙을 바라보는 구도.
    - **Physical Interaction**: 칩과 카드가 실제 물리 엔진에 의해 상호작용.
    - **Cinematic Experience**: 3D 조명과 카메라 연출을 통한 몰입감 극대화.
    - **Real-time Networking**: 웹소켓을 통한 3D 공간 동기화.

## 2. 3D 게임 메커니즘
### [Scene Graph]
- **Environment**: 누와르 스타일의 어두운 카지노 홀 (HDR 기반).
- **Physical Table**: 펠트, 나무, 가죽 재질이 적용된 3D 포커 테이블.
- **Dynamic Lights**: 테이블 중앙 SpotLight 및 개별 좌석 포인트 조명.

### [System & Physics]
- **물리 엔진 (Rapier)**: 카드가 바닥을 긁거나 칩이 서로 부딪혀 쌓이는 물리 시뮬레이션.
- **족보 계산**: 서버사이드(Edge Functions)에서 판정하고 클라이언트 3D 공간에 연출.

### [Round Flow]
1. **Pre-flop**: 3D 딜러 애니메이션(또는 카드 발사 애니메이션)으로 카드 분배.
2. **Flop/Turn/River**: 커뮤니티 카드가 테이블 중앙에 물리적으로 뒤집히며 공개.
3. **Showdown**: 물리 카드들이 공중으로 떠오르거나 강조되며 승자 판독.

## 3. 문서 링크
- [기술 사양 (tech_spec.md)](./tech_spec.md)
- [디자인 및 에셋 사양 (design_spec.md)](./design_spec.md)
- [3D 에셋 수급 가이드 (3d_asset_guide.md)](./3d_asset_guide.md)
