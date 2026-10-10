export const hasValidAuthSession = (data) => {
  return Boolean(
    data?.user?.id &&
    data?.session?.access_token &&
    data?.session?.refresh_token
  );
};
