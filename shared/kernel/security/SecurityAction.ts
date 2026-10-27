export enum SecurityAction {
  // Account management
  DeleteAccount = "DeleteAccount",
  ChangeEmail = "ChangeEmail",
  GenerateApiKey = "GenerateApiKey",
  AssignRole = "AssignRole",

  // Authentication events
  LoginSuccess = "LoginSuccess",
  LoginFailed = "LoginFailed",
  Logout = "Logout",
  AccountLocked = "AccountLocked",
  AccountUnlocked = "AccountUnlocked",

  // Password recovery
  PasswordResetRequested = "PasswordResetRequested",
  PasswordResetCompleted = "PasswordResetCompleted",

  // Email verification
  EmailVerificationSent = "EmailVerificationSent",
}
