// Firebase 프로젝트 설정값. 가계부 앱과 같은 프로젝트를 함께 쓴다 (같은 구글 계정으로 백업).
// 이 값들은 공개돼도 괜찮다. 데이터는 Firestore 보안 규칙으로 내 구글 계정만 읽고 쓸 수 있게 막는다.
// 클라우드 위치는 users/{내 계정 ID}/geonsu-days, geonsu-settings 로 가계부 기록과 섞이지 않는다.
export const firebaseConfig = {
  apiKey: 'AIzaSyDv3bmpeAeVIgiTavuXwrLy_J6FeyD4-K8',
  authDomain: 'gagyebu-heejae.firebaseapp.com',
  projectId: 'gagyebu-heejae',
  appId: '1:778193286823:web:662e9b0bec9e6a5b090d82',
};

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
