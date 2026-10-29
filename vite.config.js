import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' 로 두면 깃허브 페이지의 어떤 저장소 이름에서도 그대로 동작한다.
export default defineConfig({
  plugins: [react()],
  base: './',
});
