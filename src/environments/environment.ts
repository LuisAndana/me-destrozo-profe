export const environment = {
  production: false,
  apiBase: 'http://localhost:8000', // <-- FastAPI
  endpoints: {
    login: '/auth/login',
    register: '/usuarios/register',
    googleSignin: '/auth/google_signin',
    me: '/usuarios/me',
  },
  googleClientId: '144363202163-juhhgsrj47dp46co5bevehtmrpo54h9n.apps.googleusercontent.com'
};
