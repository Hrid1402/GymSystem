import Cookies from 'js-cookie';

const TOKEN_KEY = 'token';

export const setTokenCookie = (token) => {
  Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: 'lax' });
};

export const getTokenCookie = () => {
  return Cookies.get(TOKEN_KEY);
};

export const removeTokenCookie = () => {
  Cookies.remove(TOKEN_KEY);
};
