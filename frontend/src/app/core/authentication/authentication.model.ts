export interface LoginPayload {
  readonly username: string;
  readonly password: string;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly username: string;
  readonly role: string;
}
