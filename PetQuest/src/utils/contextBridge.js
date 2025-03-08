let globalContextRef = null;

export const setGlobalContextRef = (contextValue) => {
  globalContextRef = contextValue;
};

export const getGlobalContext = () => {
  return globalContextRef;
};