// Function to get + decode API key
const getKey = () => {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(["openai-key"], (result) => {
			if (result["openai-key"]) {
				const decodedKey = atob(result["openai-key"]);
				resolve(decodedKey);
			}
		});
	});
};

const sendMessage = (content) => {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const activeTab = tabs[0].id;

		chrome.tabs.sendMessage(
			activeTab,
			{ message: "inject", content },
			(response) => {
				if (response.status === "failed") {
					console.log("injection failed.");
				}
			}
		);
	});
};

// Setup our generate function
const generate = async (prompt) => {
	// Get your API key from storage
	const key = await getKey();
	const url = "https://api.openai.com/v1/completions";

	// Call completions endpoint
	const completionResponse = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${key}`,
		},
		body: JSON.stringify({
			model: "text-davinci-003",
			prompt: prompt,
			max_tokens: 1250,
			temperature: 0.7,
		}),
	});

	// Select the top choice and send back
	const completion = await completionResponse.json();
	return completion.choices.pop();
};

// New function here
const generateCompletionAction = async (info) => {
	try {
		// Send mesage with generating text (this will be like a loading indicator)
		sendMessage("generating...");

		const { selectionText } = info;
		const basePromptPrefix = `
      Fact check the following statement by rating whether it is True or False, and the giving a percentage score on how accurate it is. Explain your reasoning. If the rating is false, give links to articles that are reliable sources.
      `;

		// Add this to call GPT-3
		const baseCompletion = await generate(
			`${basePromptPrefix}${selectionText}`
		);


		// Send the output when we're all done
		sendMessage(baseCompletion.text);
	} catch (error) {
		console.log(error);

		// Add this here as well to see if we run into any errors!
		sendMessage(error.toString());
	}
};

// Add this in scripts/contextMenuServiceWorker.js
chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "context-run",
		title: "Factcheck",
		contexts: ["selection"],
	});
});

// Add listener
chrome.contextMenus.onClicked.addListener(generateCompletionAction);