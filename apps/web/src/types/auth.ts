export type AuthUser = {
  id: number;
  email: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  tokenType: 'Bearer';
};

export type AuthSuccess = {
  user: AuthUser;
  tokens: AuthTokens;
};
