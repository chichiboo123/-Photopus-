# GitHub Pages 수동 배포 가이드

## 자동 배포 문제 해결

GitHub Actions의 Git exit code 128 오류는 권한 설정이나 저장소 구성 문제로 발생합니다.
더 안정적인 수동 배포 방법을 사용하겠습니다.

## 수동 배포 단계

### 1. 로컬에서 빌드 및 커밋
```bash
# Git 잠금 해제
rm -f .git/index.lock .git/config.lock
find .git -name "*.lock" -delete

# 모든 변경사항 추가
git add .
git commit -m "Add GitHub Pages deployment configuration"
git push origin main
```

### 2. GitHub 저장소 설정 확인
1. https://github.com/chichiboo123/-Photopus- 방문
2. **Settings** > **Pages** 선택
3. Source 설정:
   - **Deploy from a branch** 선택
   - Branch: **main**
   - Folder: **/docs**
4. **Save** 클릭

### 3. 대안: gh-pages 브랜치 사용
GitHub Actions가 계속 실패하면 수동으로 gh-pages 브랜치에 배포:

```bash
# gh-pages 브랜치로 배포
npx gh-pages -d docs -b gh-pages

# 그 후 GitHub Settings에서 gh-pages 브랜치 선택
```

## 빌드 파일 준비 완료

현재 상태:
- `docs/` 폴더에 프로덕션 빌드 완료
- 베이스 경로 `/-Photopus-/` 설정 완료
- SPA 라우팅 지원 포함
- 파일 크기 최적화 완료

## 배포 후 접속 주소
https://chichiboo123.github.io/-Photopus-/

GitHub Actions 자동 배포가 실패해도 수동 방법으로 즉시 배포 가능합니다.