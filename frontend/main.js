document.addEventListener("DOMContentLoaded", () => {
	console.log("DOM fully loaded and parsed");

	function statusPolling() {
		fetch("/status")
			.then((response) => response.text())
			.then((data) => {
				const statusEl = document.getElementById("status");
				if (statusEl) statusEl.innerText = data;
			})
			.catch((err) => console.error("statusPolling error:", err));
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
	if (imageSourceSelector) imageSourceSelector.value = SOURCE;

	if (imageSourceSelector) {
		imageSourceSelector.addEventListener("change", () => {
			SOURCE = imageSourceSelector.value;
			localStorage.setItem("SOURCE", SOURCE);
			console.log("Selected image source:", SOURCE);
		});
	}

	// API keys modal
	const settingsLink = document.getElementById("settings-link");
	const apiKeysModal = new bootstrap.Modal(
		document.getElementById("apiKeysModal")
	);

	if (settingsLink) {
		settingsLink.addEventListener("click", () => {
			apiKeysModal.show();
			checkApiKeys();
		});
	}

	const apiKeysForm = document.getElementById("api-keys-form");
	if (apiKeysForm) {
		apiKeysForm.addEventListener("submit", (event) => {
			event.preventDefault();
			["pexels", "pixabay", "unsplash", "flickr"].forEach((service) => {
				const keyEl = document.getElementById(`${service}-api-key`);
				const key = keyEl ? keyEl.value : "";
				saveApiKey(service, key);
			});
			apiKeysModal.hide();
		});
	}

	function checkApiKeys() {
		["pexels", "pixabay", "unsplash", "flickr"].forEach(checkApiKey);
	}

	function checkApiKey(service) {
		fetch(`/credentials/get/${service}`)
			.then((response) => response.json())
			.then((data) => {
				const el = document.getElementById(`${service}-status`);
				if (el)
					el.textContent = data.exists ? "API key SET ✔️" : "API key NOT SET ❌";
			})
			.catch((err) => console.error("checkApiKey error:", err));
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
			})
			.catch((err) => console.error("saveApiKey error:", err));
	}

	// Scrape button
	const scrapeBtn = document.getElementById("scrape");
	const scrapeUrl = document.getElementById("url");

	if (scrapeUrl) {
		scrapeUrl.addEventListener("focus", () => {
			scrapeUrl.value = "";
		});
	}

	if (scrapeBtn && scrapeUrl) {
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
				})
				.catch((err) => console.error("scrape error:", err));
		});
	}

	function createTweetContainer(tweet) {
		const container = document.createElement("div");
		container.classList.add("container-t", "container", "border","border-info","rounded");

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

		// Choices.js init (if loaded)
		if (typeof Choices !== "undefined") {
			const choices = new Choices(keywordInput, {
				removeItemButton: true,
				placeholder: true,
				placeholderValue: "Enter Keywords"
			});
		}

		const selectSource = document.createElement("select");
		selectSource.classList.add("source-selector", "col");
		selectSource.disabled = !keywordInput.value; // Disable if no keyword
		selectRow.appendChild(selectSource);

		keywordInput.addEventListener("change", () => {
			selectSource.disabled = !keywordInput.value; // Disable if no keyword
		});

		const row = document.createElement("div");
		row.classList.add("row");

		const text = document.createElement("div");
		text.classList.add("grid-text", "col");
		const tweetTxt = document.createElement("p");
		tweetTxt.setAttribute("contenteditable", "true");
		tweetTxt.innerText = tweet["text"] || "";
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
			setTimeout(() => {
				closeTxt.style.display = "none";
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
		} else if (tweet["keyword"]) {
			// fallback search
			fetch(`/${SOURCE}/photo/search/${tweet["keyword"]}`)
				.then((response) => response.json())
				.then((images) => {
					if (images && images.length > 0) {
						vidPlayer.dataset.current = "0";
						vidPlayer.dataset.max = String(images.length - 1); // store max index
						vidPlayer.setAttribute("poster", images[0]);
					}
				})
				.catch((err) => console.error("image fetch error:", err));
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
		arrowLeft.addEventListener("click", function (event) {
			navigateImage("left", event.currentTarget);
		});

		const arrowRight = document.createElement("button");
		arrowRight.classList.add("arrow", "right-arrow");
		arrowRight.innerHTML = "&#9654;";
		arrowRight.addEventListener("click", function (event) {
			navigateImage("right", event.currentTarget);
		});

		vid.appendChild(arrowLeft);
		vid.appendChild(arrowRight);
		vid.appendChild(vidPlayer);
		row.appendChild(vid);

		// Create a new row for the delete button
		const deleteRow = document.createElement("div");
		deleteRow.classList.add("row", "justify-content-center");
		// Create the delete button with a recycle bin icon
		const deleteButton = document.createElement("button");
		deleteButton.classList.add("btn", "btn-outline-danger","mt-1","mb-1");
		deleteButton.innerHTML = '<i class="bi bi-trash"></i>';

		// Add event listener for delete button
		deleteButton.addEventListener("click", () => {
			if (confirm("Are you sure?")) {
				container.remove();
			}
		});

		deleteRow.appendChild(deleteButton);
		container.appendChild(deleteRow);

		container.appendChild(selectRow);
		container.appendChild(row);
		document.body.appendChild(container);

		selectSource.addEventListener("change", function () {
			const selectedSource = this.value;
			const containerEl = this.closest(".container");
			const keyword = containerEl.querySelector(".keyword-input").value;
			if (selectedSource === "original") {
				const original = this.dataset.originalUrl;
				if (original) {
					vidPlayer.setAttribute("src", original + "#t=1");
					vidPlayer.setAttribute("poster", original);
				}
			} else {
				fetch(`/${selectedSource}/photo/search/${keyword}`)
					.then((response) => response.json())
					.then((images) => {
						if (images && images.length > 0) {
							vidPlayer.dataset.current = "0";
							vidPlayer.dataset.max = String(images.length - 1);
							vidPlayer.setAttribute("poster", images[0]);
							vidPlayer.setAttribute("src", "");
						}
					})
					.catch((err) => console.error("selectSource fetch error:", err));
			}
		});
	}

	function navigateImage(direction, elem) {
		const vidPlayer = elem.parentElement.querySelector("video");
		const container = elem.closest(".container");
		const keyword = container.querySelector(".keyword-input").value;
		const source = container.querySelector(".source-selector").value;
		// fallback values (ensure ints)
		let currentIndex = parseInt(vidPlayer.dataset.current || "0", 10);
		let maxIndex = parseInt(vidPlayer.dataset.max || "0", 10); // max index (length-1)

		// Bound checks: maxIndex is the last valid index
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
				if (images && images.length > 0) {
					const newPosterUrl = images[currentIndex];
					const img = new Image(); // fixed variable name
					img.src = newPosterUrl;
					img.onload = () => {
						vidPlayer.dataset.current = String(currentIndex);
						vidPlayer.dataset.max = String(images.length - 1);
						vidPlayer.setAttribute("poster", newPosterUrl);
						vidPlayer.classList.remove("flashing-border");
					};
					img.onerror = () => {
						console.error("Failed to load image:", newPosterUrl);
						vidPlayer.classList.remove("flashing-border");
					};
				}
			})
			.catch((err) => {
				console.error("navigateImage fetch error:", err);
				vidPlayer.classList.remove("flashing-border");
			});
	}
});
