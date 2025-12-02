export const environment = {
  production: false,
  apiBase: 'http://localhost:8000',
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
  googleClientId: '815296256153-0tht6evf9u6ap498l5mfs2ept5uer3ll.apps.googleusercontent.com'
};