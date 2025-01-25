document.addEventListener("DOMContentLoaded", () => {
	console.log("DOM fully loaded and parsed");

	function statusPolling() {
		fetch("/status").then((response) =>
			response.text().then((data) => {
				document.getElementById("status").innerText = data;
			})
		);
	}

	const statusCheck = setInterval(() => {
		console.log("Polling started...");
		statusPolling();
	}, 500);

	// Image source selector
	const imageSourceSelector = document.getElementById(
		"image-source-selector"
	);
	let SOURCE = localStorage.getItem("SOURCE") || "pexels";
	localStorage.setItem("SOURCE", SOURCE);
	imageSourceSelector.value = SOURCE;

	imageSourceSelector.addEventListener("change", () => {
		SOURCE = imageSourceSelector.value;
		localStorage.setItem("SOURCE", SOURCE);
		console.log("Selected image source:", SOURCE);
	});

	// API keys modal
	const settingsLink = document.getElementById("settings-link");
	const apiKeysModal = new bootstrap.Modal(
		document.getElementById("apiKeysModal")
	);

	settingsLink.addEventListener("click", () => {
		apiKeysModal.show();
		checkApiKeys();
	});

	document
		.getElementById("api-keys-form")
		.addEventListener("submit", (event) => {
			event.preventDefault();
			["pexels", "pixabay", "unsplash", "flickr"].forEach((service) => {
				const key = document.getElementById(`${service}-api-key`).value;
				saveApiKey(service, key);
			});
			apiKeysModal.hide();
		});

	function checkApiKeys() {
		["pexels", "pixabay", "unsplash", "flickr"].forEach(checkApiKey);
	}

	function checkApiKey(service) {
		fetch(`/credentials/get/${service}`)
			.then((response) => response.json())
			.then((data) => {
				document.getElementById(`${service}-status`).textContent =
					data.exists ? "API key SET ✔️" : "API key NOT SET ❌";
			});
	}

	function saveApiKey(service, key) {
		fetch(`/credentials/set`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ service, key })
		})
			.then((response) => response.json())
			.then((data) => {
				console.log(
					data.success
						? `${service} API key saved successfully.`
						: `Failed to save ${service} API key.`
				);
			});
	}

	// Scrape button
	const scrapeBtn = document.getElementById("scrape");
	const scrapeUrl = document.getElementById("url");

	scrapeUrl.addEventListener("focus", () => {
		scrapeUrl.value = "";
	});

	scrapeBtn.addEventListener("click", () => {
		document
			.querySelectorAll(".container-t")
			.forEach((div) => div.remove());

		fetch("scrape", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ url: scrapeUrl.value })
		})
			.then((response) => response.json())
			.then((data) => {
				Object.keys(data).forEach((tweet) => {
					createTweetContainer(data[tweet]);
				});
				statusPolling();
				clearInterval(statusCheck);
			});
	});

	function createTweetContainer(tweet) {
		const container = document.createElement("div");
		container.classList.add("container-t", "container");

		const selectRow = document.createElement("div");
		selectRow.classList.add("row");

		const kwDiv = document.createElement("div");
		kwDiv.classList.add("col");
		const keywordInput = document.createElement("input");
		keywordInput.classList.add("keyword-input", "col");
		keywordInput.setAttribute("placeholder", "Enter keywords");
		if (tweet["keyword"]) {
			keywordInput.value = tweet["keyword"];
		}
		kwDiv.appendChild(keywordInput);
		selectRow.appendChild(kwDiv);

		const choices = new Choices(keywordInput, {
			removeItemButton: true,
			placeholder: true,
			placeholderValue: "Enter Keywords"
		});

		const selectSource = document.createElement("select");
		selectSource.classList.add("source-selector", "col");
		selectRow.appendChild(selectSource);

		const row = document.createElement("div");
		row.classList.add("row");

		const text = document.createElement("div");
		text.classList.add("grid-text", "col");
		const tweetTxt = document.createElement("p");
		tweetTxt.setAttribute("contenteditable", "true");
		tweetTxt.innerText = tweet["text"];
		const closeTxt = document.createElement("button");
		closeTxt.classList.add("close-button");
		closeTxt.textContent = "X";
		text.appendChild(closeTxt);
		text.appendChild(tweetTxt);
		row.appendChild(text);

		text.addEventListener("click", () => {
			text.classList.add("fstext");
			closeTxt.style.display = "block";
		});
		closeTxt.addEventListener("click", () => {
			closeTxt.style.display = "none";
			setTimeout(() => {
				text.classList.remove("fstext");
			}, 0);
		});

		const vid = document.createElement("div");
		vid.classList.add("grid-media", "col");

		const vidPlayer = document.createElement("video");

		if (tweet["vid"]) {
			vidPlayer.setAttribute("src", tweet["vid"] + "#t=1");
			vidPlayer.setAttribute("controls", "true");
			vidPlayer.setAttribute("preload", "auto");
			selectSource.dataset.originalUrl = tweet["vid"];
		} else if (tweet["img"]) {
			vidPlayer.setAttribute("poster", tweet["img"]);
			selectSource.dataset.originalUrl = tweet["img"];
		} else {
			fetch(`/${SOURCE}/photo/search/${tweet["keyword"]}`)
				.then((response) => response.json())
				.then((images) => {
					if (images.length > 0) {
						vidPlayer.dataset.current = "0";
						vidPlayer.dataset.max = images.length;
						vidPlayer.setAttribute("poster", images[0]);
					}
				});
		}

		const sources = ["pexels", "pixabay", "unsplash", "flickr", "bing"];
		selectSource.innerHTML = sources
			.map(
				(source) =>
					`<option value="${source}">${
						source.charAt(0).toUpperCase() + source.slice(1)
					}</option>`
			)
			.join("");
		selectSource.innerHTML += '<option value="original">Original</option>';
		selectSource.insertAdjacentHTML(
			"afterbegin",
			`<option value="${SOURCE}">Default</option>`
		);
		selectSource.options[0].selected = true;

		const arrowLeft = document.createElement("button");
		arrowLeft.classList.add("arrow", "left-arrow");
		arrowLeft.innerHTML = "&#9664;";
		arrowLeft.addEventListener("click", (event) =>
			navigateImage("left", event.target)
		);

		const arrowRight = document.createElement("button");
		arrowRight.classList.add("arrow", "right-arrow");
		arrowRight.innerHTML = "&#9654;";
		arrowRight.addEventListener("click", (event) =>
			navigateImage("right", event.target)
		);

		vid.appendChild(arrowLeft);
		vid.appendChild(arrowRight);
		vid.appendChild(vidPlayer);
		row.appendChild(vid);

		container.appendChild(selectRow);
		container.appendChild(row);
		document.body.appendChild(container);

		selectSource.addEventListener("change", function () {
			const selectedSource = this.value;
			const container = this.closest(".container");
			const keyword = container.querySelector(".keyword-input").value;
			if (selectedSource === "original") {
				vidPlayer.setAttribute(
					"src",
					this.dataset.originalUrl + "#t=1"
				);
				vidPlayer.setAttribute("poster", this.dataset.originalUrl);
			} else {
				fetch(`/${selectedSource}/photo/search/${keyword}`)
					.then((response) => response.json())
					.then((images) => {
						if (images.length > 0) {
							vidPlayer.dataset.current = "0";
							vidPlayer.dataset.max = images.length;
							vidPlayer.setAttribute("poster", images[0]);
							vidPlayer.setAttribute("src", "");
						}
					});
			}
		});
	}

	function navigateImage(direction, elem) {
		const vidPlayer = elem.parentElement.querySelector("video");
		const container = elem.closest(".container");
		const keyword = container.querySelector(".keyword-input").value;
		const source = container.querySelector(".source-selector").value;
		let currentIndex = parseInt(vidPlayer.dataset.current);
		const maxIndex = parseInt(vidPlayer.dataset.max);

		if (direction === "right" && currentIndex < maxIndex) {
			currentIndex += 1;
		} else if (direction === "left" && currentIndex > 0) {
			currentIndex -= 1;
		} else {
			return;
		}

		vidPlayer.classList.add("flashing-border");
		fetch(`/${source}/photo/search/${keyword}`)
			.then((response) => response.json())
			.then((images) => {
				if (images.length > 0) {
					const newPosterUrl = images[currentIndex];
					const img = new Image();
					img.src = newPosterUrl;
					img.onload = () => {
						vidPlayer.dataset.current = currentIndex;
						vidPlayer.dataset.max = images.length;
						vidPlayer.setAttribute("poster", newPosterUrl);
						vidPlayer.classList.remove("flashing-border");
					};
				}
			});
	}
});
