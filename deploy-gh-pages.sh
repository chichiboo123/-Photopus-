#!/bin/bash

echo "Building for GitHub Pages..."

# GitHub Pages용 빌드 실행
NODE_ENV=production npx vite build --config vite.config.gh-pages.ts

# 빌드 결과 확인
if [ -d "dist-gh-pages" ]; then
    echo "Build successful! Files created in dist-gh-pages/"
    ls -la dist-gh-pages/
    
    echo ""
    echo "To deploy to GitHub Pages:"
    echo "1. Commit and push all changes to your repository"
    echo "2. Run: npx gh-pages -d dist-gh-pages"
    echo "3. Go to your repository settings and enable GitHub Pages from gh-pages branch"
    echo ""
    echo "Your site will be available at: https://chichiboo123.github.io/-Photopus-/"
else
    echo "Build failed!"
    exit 1
fi