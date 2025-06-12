# GitHub Pages 배포 완료 가이드

## 현재 상태
✅ GitHub Pages용 빌드 완료 (`docs/` 폴더)
✅ 베이스 경로 `/-Photopus-/` 설정 완료
✅ SPA 라우팅 지원 설정 완료

## 배포 단계

### 1. Git 잠금 해제 (터미널에서 실행)
```bash
# 잠금 파일 제거
rm -f .git/index.lock
rm -f .git/config.lock
find .git -name "*.lock" -delete
```

### 2. Git 커밋 및 푸시
```bash
git add .
git commit -m "Fix GitHub Pages base path"
git push origin main
```

### 3. GitHub Pages 활성화
1. https://github.com/chichiboo123/-Photopus- 방문
2. Settings > Pages
3. Source: Deploy from a branch
4. Branch: main
5. Folder: /docs
6. Save 클릭

### 4. 완료
사이트 주소: **https://chichiboo123.github.io/-Photopus-/**

## 빠른 확인사항
✅ 저장소 이름이 `-Photopus-`와 일치
✅ 베이스 경로가 `/`로 시작하고 끝남
✅ 번들러와 라우터가 동일한 베이스 경로 사용

모든 설정이 완료되었습니다!