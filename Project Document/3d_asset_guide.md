# 3D 에셋 수급 및 기술 가이드 (Asset Requirements)

사용자께서 직접 에셋을 수집하실 때 참고하실 모델 규격 및 권장 사양입니다. 3D 공간의 퀄리티는 에셋의 품질이 80%를 결정합니다.

## 1. 포커 테이블 (Poker Table)
*   **권장 포맷**: `.glb` 또는 `.gltf` (텍스처 포함형)
*   **주요 사양**:
    *   **Low to Mid Poly**: 웹 브라우저 최적화를 위해 약 1만~5만 폴리곤 권장. (너무 고사양이면 로딩이 깁니다.)
    *   **PBR Materials**: `Felt(천)`, `Wood(나무)`, `Leather(가죽)` 질감이 분리되어 있는 모델.
*   **추천 키워드**: "Poker Table", "Casino Table", "Highpoly Table".

## 2. 플레이잉 카드 (Playing Cards)
*   **구현 방식**: 모델을 가져오는 것보다, 제가 코드로 아주 얇은 **'Rounded Box Mesh'**를 만드는 것이 텍스처 매핑(이미지 입히기)에 훨씬 유리합니다.
*   **필요한 이미지**: 기존에 사용하던 카드 스프라이트 시트(`cards_spritesheet.png`)를 그대로 사용합니다.

## 3. 카지노 칩 (Poker Chips)
*   **권장 포맷**: `.glb` (텍스처 포함형)
*   **주요 사양**:
    *   **옆면 디테일**: 칩이 쌓였을 때 옆면의 줄무늬가 보여야 리얼합니다.
    *   **수치/색상**: 물리적으로 같은 모델을 여러 번 복제(`Instanced Mesh`)하여 색상만 바꿔 쓸 예정입니다.

## 4. 환경 조명 (Environment/HDR)
*   **권장 포맷**: `.hdr` 또는 `.exr`
*   **컨셉**: "Deep Dark Casino", "Elegant Bar", "Night Club".
*   **역할**: 별도의 전구 설치 없이도 전체 장면에 아주 사실적인 반사광과 색감을 입혀줍니다.

## 5. 효과음 (Sound Effects)
*   **필요 리스트**:
    *   `chip_click.mp3`: 칩끼리 부딪히는 소리.
    *   `card_slide.mp3`: 카드가 펠트 위를 긁는 소리.
    *   `card_flip.mp3`: 카드를 뒤집는 소리.
    *   `ambient_casino.mp3`: 은은하게 깔리는 카지노 소음 (BGM).

---

### 에셋을 구하신 후에는?
구하신 파일들을 프로젝트의 `public/assets/models/` 또는 `public/assets/textures/` 폴더에 넣어주시면 제가 바로 3D 장면에 렌더링하겠습니다! ㅇㅋ?
