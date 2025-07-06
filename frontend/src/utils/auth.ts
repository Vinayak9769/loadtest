export const setAuthToken = (token: string) => {
    document.cookie = `authToken=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
};

export const getAuthToken = (): string | null => {
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('authToken='));
    return authCookie ? authCookie.split('=')[1] : null;
};

export const removeAuthToken = () => {
    document.cookie = 'authToken=; path=/; max-age=0';
};