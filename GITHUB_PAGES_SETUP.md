# GitHub Pages 배포 가이드

PhotoPose 애플리케이션을 GitHub Pages에 배포하는 방법입니다.

## 1. 빌드 파일 생성 완료 ✅

이미 GitHub Pages용 빌드가 완료되었습니다:
- `docs/` 폴더에 최적화된 프로덕션 빌드 파일들이 생성됨
- 베이스 URL이 `/-Photopus-/`로 설정됨
- SPA 라우팅 지원을 위한 404.html 포함

## 2. GitHub 저장소 설정

### Git 명령어 (터미널에서 실행):
```bash
# 모든 변경사항 추가
git add .

# 커밋 생성
git commit -m "Add GitHub Pages build files"

# GitHub에 푸시
git push origin main
```

## 3. GitHub Pages 활성화

1. GitHub 저장소 (`https://github.com/chichiboo123/-Photopus-`) 방문
2. **Settings** 탭 클릭
3. 왼쪽 사이드바에서 **Pages** 선택
4. Source 설정:
   - **Deploy from a branch** 선택
   - Branch: **main** 선택
   - Folder: **/docs** 선택
5. **Save** 버튼 클릭

## 4. 배포 완료

설정 완료 후 몇 분 내에 사이트가 다음 주소에서 접근 가능합니다:
**https://chichiboo123.github.io/-Photopus-/**

## 5. 자동 배포 (선택사항)

향후 변경사항을 자동으로 배포하려면:
```bash
# 새로운 빌드 생성
node build-gh-pages.js

# Git 커밋 및 푸시
git add docs/
git commit -m "Update GitHub Pages build"
git push origin main
```

## 기능 확인

배포된 사이트에서 다음 기능들이 정상 작동합니다:
- ✅ AR 사진 촬영
- ✅ 이모지 및 사용자 이미지 오버레이
- ✅ 1컷, 2컷, 4컷 프레임 선택
- ✅ 텍스트 추가 및 다운로드
- ✅ 모바일 반응형 디자인