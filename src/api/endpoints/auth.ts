const BASE_AUTH = '/auth/';

export const authEndpoints = {
    login: `${BASE_AUTH}jwt/create/`,
    refreshToken: `${BASE_AUTH}jwt/refresh/`,
    logout: `${BASE_AUTH}jwt/logout/`,
    mfaVerifyLink: `${BASE_AUTH}mfa/verify-link/`,
    resetPassword: `${BASE_AUTH}users/reset_password/`,
    resetPasswordConfirm: `${BASE_AUTH}users/reset_password_confirm/`,
};
