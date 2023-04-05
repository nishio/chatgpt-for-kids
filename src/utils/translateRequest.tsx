export async function translateToEnglish(text) {
  console.log("translateToEnglish", text);
  const requestMessageList = [
    {
      role: "system",
      content: "Translate the following text to English:",
    },
    {
      role: "user",
      content: text,
    },
  ];

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "jaen",
      messages: requestMessageList,
      apiKey: localStorage.getItem("api_key") ?? "",
    }),
  });

  return response;
}
export async function translateToJapanese(text) {
  const requestMessageList = [
    {
      role: "system",
      content: "Translate the following text to Japanese:",
    },
    {
      role: "user",
      content: text,
    },
  ];

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "enja",
      messages: requestMessageList,
      apiKey: localStorage.getItem("api_key") ?? "",
    }),
  });

  return response;
}
