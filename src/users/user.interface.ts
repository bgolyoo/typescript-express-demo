interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  twoFactorAuthenticationCode?: string;
  isTwoFactorAuthenticationEnabled?: boolean;
}

export default User;
