document.addEventListener('DOMContentLoaded', function() {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svgContainer = document.getElementById("dungeonMap");

    // Area data with optional image URLs
    const areas = [
        { "name": "Summit Trail", "url": "../img/summit_trail.png" },
        { "name": "Alpine Forest", "url": "../img/alpine_forest.png" },
        { "name": "Circle of the Moon", "url": "../img/circle_of_the_moon.png" },
        { "name": "Cody Cottage", "url": "../img/cosy_cottage.png" },
        { "name": "Old Oak Tree", "url": "../img/old_oak.png" },
        { "name": "Great Library", "url": "../img/great_library.png" },
        { "name": "Cosy Coffee Shop", "url": "../img/cafe.png" },
        { "name": "Paris", "url": "../img/paris.png" },
        { "name": "Haunted Mansion", "url": "../img/haunted_mansion.png" },
    ];

    const cols = 3;
    const spacing = 10;
    const rectWidth = (svgContainer.clientWidth - (cols + 1) * spacing) / cols;
    const rectHeight = 140;

    function createRect(x, y, width, height, color) {
        let rect = document.createElementNS(svgNamespace, "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", width);
        rect.setAttribute("height", height);
        rect.setAttribute("fill", color);
        rect.setAttribute("stroke", "black");
        svgContainer.appendChild(rect);
    }

    function createText(x, y, text) {
        let background = document.createElementNS(svgNamespace, "rect");
        background.setAttribute("x", x);
        background.setAttribute("y", y - 14);
        background.setAttribute("width", 80);
        background.setAttribute("height", 20);
        background.setAttribute("fill", "white");
        background.setAttribute("fill-opacity", "0.6");

        let textElement = document.createElementNS(svgNamespace, "text");
        textElement.setAttribute("x", x + 5);
        textElement.setAttribute("y", y);
        textElement.setAttribute("fill", "black");
        textElement.setAttribute("font-size", "10px");
        textElement.textContent = text;

        svgContainer.appendChild(background);
        svgContainer.appendChild(textElement);
    }

    function createImage(x, y, width, height, url) {
        if (!url) return;  // If no URL is provided, do nothing
        let image = document.createElementNS(svgNamespace, "image");
        image.setAttribute("x", x);
        image.setAttribute("y", y);
        image.setAttribute("width", width);
        image.setAttribute("height", height);
        image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
        svgContainer.appendChild(image);
    }

    // fill with black
    createRect(0, 0, svgContainer.clientWidth, svgContainer.clientHeight, "black");

    areas.forEach((area, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = spacing + (rectWidth + spacing) * col;
        const y = spacing + (rectHeight + spacing) * row;
        const color = 'black';//`hsl(${index / areas.length * 360}, 70%, 70%)`;

        createRect(x, y, rectWidth, rectHeight, color);  // Create the rectangle
        createImage(x, y, rectWidth, rectHeight, area.url);  // Create the image if URL exists
        createText(x, y + rectHeight - 20, area.name);  // Add the text label at the bottom
    });
});
