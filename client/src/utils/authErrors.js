export const shouldDiscardStoredToken = (error) => [401, 404].includes(error?.response?.status);
