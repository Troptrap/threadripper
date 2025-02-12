
			document.addEventListener("DOMContentLoaded", function () {
				function changeFont(h2Selector, fontName, fontUrl) {
					let styleTag = document.getElementById("dynamicFontStyle");
					if (!styleTag) {
						styleTag = document.createElement("style");
						styleTag.id = "dynamicFontStyle";
						document.head.appendChild(styleTag);
					}

					const newFontFace = new FontFace(
						fontName,
						`url(${fontUrl}) format('truetype')`
					);
					newFontFace
						.load()
						.then((loadedFont) => {
							document.fonts.add(loadedFont);

							// Apply the font to the h2 element
							styleTag.innerHTML = `
            #${h2Selector} {
                font-family: '${fontName}', sans-serif;
                -webkit-text-stroke: 2px red;
            }
        `;
						})
						.catch((err) => {
							console.error("Font loading failed:", err);
						});
				}

				fetch("/fonts") // Fetch the font list from the Flask route
					.then((response) => response.json())
					.then((fonts) => {
						const select = document.getElementById("fontSelect");
						select.innerHTML = ""; // Clear previous options

						let appFonts = [];
						let systemFonts = [];

						// Categorize fonts into "app" and "system"
						for (const [fontName, source] of Object.entries(
							fonts
						)) {
							if (source === "app") {
								appFonts.push(fontName);
							} else if (source === "system") {
								systemFonts.push(fontName);
							}
						}

						// Function to add options to select
						function addOption(value, text, disabled = false) {
							const option = document.createElement("option");
							option.value = value;
							option.textContent = text;
							if (disabled) {
								option.disabled = true;
								option.style.fontWeight = "bold"; // Optional: Style disabled options
							}
							select.appendChild(option);
						}

						// Add "APP" section
						if (appFonts.length > 0) {
							addOption("", "── APP ──", true);
							appFonts.forEach((font) => addOption(font, font));
						}

						// Add "SYSTEM" section
						if (systemFonts.length > 0) {
							addOption("", "── SYSTEM ──", true);
							systemFonts.forEach((font) =>
								addOption(font, font)
							);
						}
						select.addEventListener("change", function () {
							let demoText = document.getElementById("demoText");
							changeFont(
								"demoText",
								select.value,
								`/fonts/${select.value}.ttf`
							);
						});
					})
					.catch((error) => {
						console.error("Error fetching fonts:", error);
					});

				function toHex(value) {
					let hex = value.toString(16);
					return hex.length === 1 ? "0" + hex : hex;
				}
				let colorInput = document.getElementById("colorInput");
				let opacityInput = document.getElementById("opacityInput");
				let resultColor = document.getElementById("resultColor");
				function getColor() {
					let color = colorInput.value;
					let opacity = parseInt(opacityInput.value, 10);
					let alpha = Math.round((opacity * 255) / 100);
					let alphaHex = toHex(alpha);
					let hexColor8 = color + alphaHex;
					return hexColor8;
				}
				resultColor.style.color = getColor();
				colorInput.addEventListener("change", function () {
					resultColor.style.color = getColor();
				});

				opacityInput.addEventListener("input", function () {
					document.getElementById("opacityValue").textContent =
						this.value + "%";
					resultColor.style.color = getColor();
				});

				document
					.getElementById("generateBtn")
					.addEventListener("click", function () {
						document.getElementById("result").value =
							getColor().toUpperCase();
					});
			});
		