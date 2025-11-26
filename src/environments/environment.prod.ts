export const environment = {
  production: true,
  apiBase: 'https://backendfitman-production-175f.up.railway.app',
  endpoints: {
    login: '/auth/login',
    register: '/usuarios/register',
    googleSignin: '/auth/google_signin',
    me: '/usuarios/me',
    checkEmail: '/email/check',
    sendVerification: '/email/send-verification',
    verifyEmail: '/email/verify',
    resendVerification: '/email/resend-verification',
    verificationStatus: '/email/verification-status',
    stripePublicKey: "pk_test_51SUdMoEwnNTMkfQfPAiN2aOQUw5e9FmDr41o5TkWMd3Mp4KKATAvLMwER9Oz2kHBaBbdSmzWBYnVolP3XszNkfwI00AKDm9YVx"
  },
  googleClientId: '144363202163-juhhgsrj47dp46co5bevehtmrpo54h9n.apps.googleusercontent.com'
};