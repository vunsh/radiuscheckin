export function isApprovedUser(email) {
  if (!email) return false;
  
  const approvedUsers = process.env.NEXT_PUBLIC_APPROVED_USERS?.split(' ') || [];
  return approvedUsers.includes(email);
}

export function getApprovedUsers() {
  return process.env.NEXT_PUBLIC_APPROVED_USERS?.split(' ') || [];
}
