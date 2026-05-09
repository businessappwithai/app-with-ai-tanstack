/* eslint-disable */
// examples.ts

// 1. Basic Completion
async function basicCompletion() {
  const response = await openai.Completion.create({
    model: "text-davinci-003",
    prompt: "Once upon a time, ",
    max_tokens: 50,
  });
  console.log(response.choices[0].text);
}

// 2. Chat Completion
async function chatCompletion() {
  const messages = [
    { role: "user", content: "Hello!" },
    { role: "assistant", content: "Hi there! How can I assist you today?" },
  ];
  const response = await openai.ChatCompletion.create({
    model: "gpt-3.5-turbo",
    messages: messages,
  });
  console.log(response.choices[0].message.content);
}

// 3. Retry Mechanism
async function completionWithRetry() {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await openai.Completion.create({}); // your parameters
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed: ${error.message}`);
    }
  }
  throw new Error("All attempts failed.");
}

// 4. Streaming Completion
async function streamingCompletion() {
  const stream = openai.Completion.create({
    model: "text-davinci-003",
    prompt: "What is the meaning of life?",
    stream: true,
  });
  stream.on("data", (data) => {
    console.log(data.choices[0].text);
  });
}

// 5. Chat Streaming
async function chatStreaming() {
  const messages = [{ role: "user", content: "Tell me a joke!" }];
  const stream = openai.ChatCompletion.create({
    model: "gpt-3.5-turbo",
    messages: messages,
    stream: true,
  });
  stream.on("data", (data) => {
    console.log(data.choices[0].message.content);
  });
}

// 6. Handling Errors
async function handleErrorExample() {
  try {
    const response = await openai.Completion.create({}); // your parameters
  } catch (error) {
    console.error("An error occurred:", error);
  }
}
