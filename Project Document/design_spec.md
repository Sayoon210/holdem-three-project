# 디자인 및 시각 사양 (Design Specifications - 3D Pivot)

## 1. 비주얼 컨셉: Noir Modern Casino
- **Concept**: 어둠 속에서 오직 테이블만이 빛나는 극단적인 고대비 연출.
- **Atmosphere**: 연기 자욱한(Fog) 지하 카지노, 금속과 가죽의 질감이 느껴지는 3D 재질감.

## 2. 3D 요소 구성
### [Table Design]
- **Oval Table**: 클래식한 오벌형 텍사스 홀덤 테이블.
- **Felt Material**: 다크 그린(`Emerald Green`) 또는 딥 레드(`Burgundy`).
- **Rim Light**: 테이블 테두리를 따라 빛나는 은은한 금속성 광택.

### [Interactive Cards]
- **Geometry**: 모서리가 둥근 초박형 박스 메쉬.
- **Peeking Effect**: 셰이더(Shader) 또는 물리 변형으로 카드가 구부러지는(Bending) 효과.
- **Flip Animation**: 3D 공간에서의 회전을 통한 실제적인 뒤집기.

### [Chip Visuals]
- **Colors**: 화이트(1), 레드(5), 블루(10), 그린(25), 블랙(100).
- **Stacking**: 칩이 쌓였을 때 수직으로 정렬되지 않고 미세하게 비뚤어진 모습 연출 (물리 엔진 기반).

## 3. 카메라 및 연출
- **POV**: 플레이어 좌석 시점 (1인칭 느낌).
- **Camera Shake**: 칩이 크게 들어오거나 승리 시 발생하는 미세한 쉐이크 연출.
- **Bloom**: 금속 부위나 카드 뒷면의 금박 문양이 빛나는 효과.

## 4. HUD (Heads-Up Display)
- 3D 공간 위에 오버레이되는 2D UI (React HTML 레이어).
- 플레이어 이름, 현재 베팅액 표시.
