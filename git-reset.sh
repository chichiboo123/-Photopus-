#!/bin/bash

# Git 잠금 파일들 제거
find .git -name "*.lock" -type f -delete 2>/dev/null || true

# Git 상태 확인 및 복구
git status
if [ $? -ne 0 ]; then
    echo "Git 상태 복구 중..."
    git fsck --full
    git gc --prune=now
fi

# 변경사항 추가 및 커밋
git add .
git commit -m "Fix git index lock issue and update PhotoPose application"
git push origin main

echo "Git 문제 해결 완료!"