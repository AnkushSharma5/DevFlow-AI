const createGeminiAdapter = (GoogleGenAI) => {
  let client = null;
  let clientKey = null;

  return {
    async generateContent({ apiKey, model, prompt }) {
      if (!client || clientKey !== apiKey) {
        client = new GoogleGenAI({
          apiKey,
          httpOptions: {
            timeout: 30000,
            retryOptions: { attempts: 1 },
          },
        });
        clientKey = apiKey;
      }

      const response = await client.models.generateContent({ model, contents: prompt });
      return response.text || '';
    },
  };
};

module.exports = { createGeminiAdapter };
