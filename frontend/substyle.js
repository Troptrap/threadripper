document.addEventListener("DOMContentLoaded", () => {
	/* ---------------------------
	 * 1️⃣ VARIABLES
	 * --------------------------- */
	const demoText = document.getElementById("demoText");
	const select = document.getElementById("fontSelect");
	const colorInput = document.getElementById("colorInput");
	const outlineColorInput = document.getElementById("outlineColorInput");
	const outlineInput = document.getElementById("outline");
	const outlineSize = document.getElementById("outline-size");
	const fontSize = document.getElementById("fontsize");
	const fontSizeVal = document.getElementById("font-size");
	const resultColor = document.getElementById("resultColor");
	const highlightType = document.getElementById("htype");
	const allCaps = document.getElementById("caps");
	const highlightColorInput = document.getElementById("highlightColorInput");

	const initialColor = (highlightColorInput.dataset.jscolor.match(
		/value:\s*'([^']+)'/
	) || [])[1];

	/* ---------------------------
	 * 2️⃣ FUNCTION DEFINITIONS
	 * --------------------------- */

	const getColor = () => colorInput.value;

	function populateSizeSelectors() {
		const fontSizeSelect = document.getElementById("fontsize");
		const outlineSelect = document.getElementById("outline");

		if (!fontSizeSelect || !outlineSelect) return;

		// Populate main font sizes (8–72 px, step 2)
		Array.from({ length: (72 - 8) / 2 + 1 }, (_, i) => 8 + i * 2).forEach(
			size => {
				const option = document.createElement("option");
				option.value = size;
				option.textContent = `${size}px`;
				if (size === 26) option.selected = true;
				fontSizeSelect.appendChild(option);
			}
		);

		// Populate outline sizes (None, 1–4)
		[
			{ value: 0, label: "None" },
			...[1, 2, 3, 4].map(n => ({ value: n, label: `${n}px` }))
		].forEach(({ value, label }) => {
			const option = document.createElement("option");
			option.value = value;
			option.textContent = label;
			if (value === 1) option.selected = true;
			outlineSelect.appendChild(option);
		});
	}

	const allCapital = () => {
		demoText.innerHTML = allCaps.checked
			? demoText.innerHTML.toUpperCase()
			: demoText.innerHTML.toLowerCase();
	};

	const highlightText = (elem, color) => {
		const highlightTypeElem = document.querySelector(
			'input[name="options"]:checked'
		);
		const highlightType = highlightTypeElem?.id;
		let text = elem.innerHTML.replace(/<span[^>]*>(.*?)<\/span>/g, "$1");

		console.log(highlightType);

		const firstIndex = text.indexOf("@");
		const lastIndex = text.lastIndexOf("@");
		let newText;

		if (
			firstIndex !== -1 &&
			lastIndex !== -1 &&
			firstIndex !== lastIndex &&
			highlightType === "hbox"
		) {
			const highlightedWord = text.substring(firstIndex + 1, lastIndex);
			const highlightedSpan = `@<span style="background-color: ${color};">${highlightedWord}</span>@`;
			newText = `${text.substring(
				0,
				firstIndex
			)}${highlightedSpan}${text.substring(lastIndex + 1)}`;
		} else if (
			firstIndex !== -1 &&
			lastIndex !== -1 &&
			firstIndex !== lastIndex &&
			highlightType === "hcolor"
		) {
			const highlightedWord = text.substring(firstIndex + 1, lastIndex);
			const highlightedSpan = `@<span style="color: ${color};">${highlightedWord}</span>@`;
			newText = `${text.substring(
				0,
				firstIndex
			)}${highlightedSpan}${text.substring(lastIndex + 1)}`;
		} else {
			newText = text;
		}

		elem.innerHTML = newText;
	};

	const changeFont = (fontName, fontUrl) => {
		const newFontFace = new FontFace(
			fontName,
			`url(${fontUrl}) format('truetype')`
		);

		newFontFace
			.load()
			.then(loadedFont => {
				document.fonts.add(loadedFont);
				demoText.style.fontFamily = fontName;
			})
			.catch(err => console.error("Font loading failed:", err));
	};

	const addOption = (selectElem, value, text, disabled = false) => {
		const option = document.createElement("option");
		option.value = value;
		option.textContent = text;
		if (disabled) {
			option.disabled = true;
			option.style.fontWeight = "bold";
		}
		selectElem.appendChild(option);
	};

	/* ---------------------------
	 * 3️⃣ CODE EXECUTION & EVENTS
	 * --------------------------- */
	populateSizeSelectors();
	// Initialize colors and highlight
	resultColor.style.color = getColor();
	highlightText(demoText, initialColor);

	// Fetch available fonts
	fetch("/fonts")
		.then(res => res.json())
		.then(fonts => {
			select.innerHTML = "";
			const appFonts = [];
			const systemFonts = [];

			Object.entries(fonts).forEach(([fontName, source]) => {
				if (source === "app") appFonts.push(fontName);
				else if (source === "system") systemFonts.push(fontName);
			});

			if (appFonts.length > 0) {
				addOption(select, "", "── APP ──", true);
				appFonts.forEach(font => addOption(select, font, font));
			}

			if (systemFonts.length > 0) {
				addOption(select, "", "── SYSTEM ──", true);
				systemFonts.forEach(font => addOption(select, font, font));
			}

			select.addEventListener("change", () => {
				changeFont(select.value, `/fonts/${select.value}.ttf`);
			});
		})
		.catch(err => console.error("Error fetching fonts:", err));

	// All caps toggle
	allCaps.addEventListener("change", allCapital);

	// Text color & outline updates
	colorInput.addEventListener("change", () => {
		demoText.style.color = getColor();
		demoText.style[
			"-webkit-text-stroke"
		] = `${outlineInput.value}px ${outlineColorInput.value}`;
	});

	outlineInput.addEventListener("change", () => {
		demoText.style.color = getColor();
		demoText.style[
			"-webkit-text-stroke"
		] = `${outlineInput.value}px ${outlineColorInput.value}`;
	});

	outlineColorInput.addEventListener("change", () => {
		demoText.style.color = getColor();
		demoText.style[
			"-webkit-text-stroke"
		] = `${outlineInput.value}px ${outlineColorInput.value}`;
	});

	// Font size control
	fontSize.addEventListener("change", () => {
		demoText.style.fontSize = `${fontSize.value}px`;
	});

	// Highlight color & text updates
	const updateHighlight = () =>
		highlightText(demoText, highlightColorInput.value);

	highlightType.addEventListener("change", updateHighlight);
	highlightColorInput.addEventListener("change", updateHighlight);
	demoText.addEventListener("input", updateHighlight);

	// Save config
	document.getElementById("saveCfg").addEventListener("click", () => {
		
		const highlightTypeElem = document.querySelector(
			'input[name="options"]:checked'
		);
		const highlightType = highlightTypeElem?.id;
		let subsCfg = {};
		subsCfg["font"] = select.value;
		subsCfg["font-size"] = fontSize.value;
		subsCfg["font-color"] = getColor();
		subsCfg["outline-size"] = outlineInput.value;
		subsCfg["outline-color"] = outlineColorInput.value;
		subsCfg["highlight-type"] = highlightType.substring(1);
		subsCfg["caps"] = allCaps.checked ? "true":"false";
		fetch('/save_settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    section: "subtitles",
    settings: subsCfg
  })
});
		
		
	});
});
