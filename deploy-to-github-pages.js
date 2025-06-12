#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 GitHub Pages 배포 시작...');

try {
  // 1. 빌드 실행
  console.log('📦 프로덕션 빌드 생성 중...');
  execSync('node build-gh-pages.js', { stdio: 'inherit' });
  
  // 2. docs 폴더 확인
  if (!fs.existsSync('docs')) {
    throw new Error('docs 폴더가 생성되지 않았습니다.');
  }
  
  console.log('✅ 빌드 완료');
  
  // 3. Git 상태 확인 및 커밋
  try {
    console.log('📝 Git 커밋 준비 중...');
    
    // Git 잠금 파일 제거 시도
    try {
      execSync('find .git -name "*.lock" -delete', { stdio: 'pipe' });
    } catch (e) {
      // 잠금 파일이 없을 수 있으므로 오류 무시
    }
    
    // Git 상태 확인
    execSync('git add docs/', { stdio: 'inherit' });
    execSync('git commit -m "Update GitHub Pages build" || echo "No changes to commit"', { stdio: 'inherit' });
    
    console.log('✅ Git 커밋 완료');
    
  } catch (gitError) {
    console.log('⚠️  Git 커밋 실패 - 수동으로 처리 필요');
    console.log('다음 명령어를 실행해주세요:');
    console.log('git add docs/');
    console.log('git commit -m "Update GitHub Pages build"');
    console.log('git push origin main');
  }
  
  console.log('');
  console.log('🎉 배포 준비 완료!');
  console.log('');
  console.log('다음 단계:');
  console.log('1. GitHub 저장소 방문: https://github.com/chichiboo123/-Photopus-');
  console.log('2. Settings > Pages');
  console.log('3. Source: Deploy from a branch');
  console.log('4. Branch: main, Folder: /docs');
  console.log('5. Save 클릭');
  console.log('');
  console.log('배포 후 접속 주소: https://chichiboo123.github.io/-Photopus-/');
  
} catch (error) {
  console.error('❌ 배포 실패:', error.message);
  process.exit(1);
}