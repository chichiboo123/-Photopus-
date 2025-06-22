import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildForGitHubPages() {
  try {
    console.log('Building PhotoPose for GitHub Pages...');
    
    await build({
      base: '/-Photopus-/',
      plugins: [react({
        jsxRuntime: 'automatic'
      })],
      root: path.resolve(__dirname, 'client'),
      build: {
        outDir: path.resolve(__dirname, 'docs'),
        emptyOutDir: true,
        sourcemap: false,
        minify: true
      },
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "client", "src"),
          "@shared": path.resolve(__dirname, "shared"),
          "@assets": path.resolve(__dirname, "attached_assets"),
        },
      },
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });
    
    console.log('✅ Build completed successfully!');
    console.log('📁 Files generated in ./docs/ directory');
    console.log('🚀 Ready for GitHub Pages deployment');
    console.log('');
    console.log('Next steps:');
    console.log('1. Commit all changes to your repository');
    console.log('2. Push to GitHub: git push origin main');
    console.log('3. Go to repository Settings > Pages');
    console.log('4. Set source to "Deploy from a branch"');
    console.log('5. Select "main" branch and "/docs" folder');
    console.log('6. Your site will be available at: https://chichiboo123.github.io/-Photopus-/');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildForGitHubPages();