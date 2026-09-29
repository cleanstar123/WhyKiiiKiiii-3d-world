# WhyKiiiKiii TOUR 3D World (프로토타입)

키키(KiiiKiii) EP [WhyKiiiKiii] 컨셉에서 영감을 받은 비공식 팬메이드, 비영리 three.js 프로젝트.
멤버 모습, 앨범 커버, 공식 로고, 뮤비 장면, 음원은 포함하지 않는다.

## 실행
```
npm install     # 자동완성용 타입과 로컬 서버만 설치 (three.js 자체는 CDN에서 로드)
npm run dev     # http://localhost:5173
```
index.html 을 더블클릭(file://)해서 열면 ES 모듈이 막혀 동작하지 않는다.

## 구조
```
index.html            import map(three CDN), DOM UI
style.css
src/main.js           렌더러, 상태 흐름(hub → zooming → scene → returning), 입력
src/ui.js             하단 타임라인, 힌트, 장면 OSD
src/hub/Hub.js        허브 공간, 캠코더 배치, 렌더 타깃 갱신, 클릭 판정
src/hub/camcorders.js 핸디캠 / VHS / 디카 모델 (기본 도형 조립)
src/hub/lcdMaterial.js 액정 셰이더 + ● REC 오버레이
src/fx/VhsPass.js     화면 전체 VHS 글리치 후처리
src/zones/*.js        구역별 장면. index.js 에 한 줄 추가하면 캠코더가 늘어난다
src/core/*.js         툰 재질, 외곽선, 트윈, 텍스처, 시계
```
