import api from "./api";
import { auth } from "./firebase";

const authConfig = async () => {
  const token =
    await auth.currentUser?.getIdToken();

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const sendAIMessage = async (
  message,
  conversationId = null
) => {
  const config = await authConfig();

  const response = await api.post(
    "/ai/chat",
    {
      message,
      conversationId,
      notifyWhenReady: true,
    },
    {
      ...config,
      timeout: 15000,
    }
  );

  return response.data;
};

export const getAIConversation = async (
  conversationId
) => {
  const config = await authConfig();

  const response = await api.get(
    `/ai/conversations/${conversationId}`,
    config
  );

  return response.data;
};