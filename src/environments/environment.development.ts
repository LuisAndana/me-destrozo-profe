// src/environments/environment.development.ts

export const environment = {
  production: false,
  apiBase: 'http://localhost:8000',
  endpoints: {
    login: '/auth/login',
    register: '/usuarios/register',
    googleSignin: '/auth/google_signin',
    me: '/usuarios/me',
    // Email Verification Endpoints 
    checkEmail: '/email/check',
    sendVerification: '/email/send-verification',
    verifyEmail: '/email/verify',
    resendVerification: '/email/resend-verification',
    verificationStatus: '/email/verification-status',
    stripePublicKey: "pk_test_51SUdMoEwnNTMkfQfPAiN2aOQUw5e9FmDr41o5TkWMd3Mp4KKATAvLMwER9Oz2kHBaBbdSmzWBYnVolP3XszNkfwI00AKDm9YVx"
  },
  googleClientId: '144363202163-juhhgsrj47dp46co5bevehtmrpo54h9n.apps.googleusercontent.com'
};