const BASE_AUTH = '/auth/';

export const authEndpoints = {
    register: `${BASE_AUTH}users/`,
    login: `${BASE_AUTH}jwt/create/`,
    refreshToken: `${BASE_AUTH}jwt/refresh/`,
    resetPassword: `${BASE_AUTH}users/reset_password/`,
    resetPasswordConfirm: `${BASE_AUTH}users/reset_password_confirm/`,
};
