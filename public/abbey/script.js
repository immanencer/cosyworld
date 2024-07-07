// Global variables
let stories = [];
let avatars = [];

// DOM elements
const searchInput = document.getElementById('searchInput');
const scrollList = document.getElementById('scrollList');
const readingPane = document.getElementById('readingPane');
const storyContent = document.getElementById('storyContent');
const toggleViewButton = document.getElementById('toggleViewButton');
const noDataMessage = document.getElementById('noDataMessage');

// Event listeners
document.addEventListener('DOMContentLoaded', initializeApp);
searchInput.addEventListener('input', handleSearch);
toggleViewButton.addEventListener('click', toggleView);
scrollList.addEventListener('click', handleScrollItemClick);

async function initializeApp() {
    await fetchData();
    updateScrollList(stories);
}

async function fetchData() {
    try {
        const response = await fetch('/ranker/data');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        stories = data.summaries;
        avatars = data.avatars;
        if (stories.length === 0) {
            noDataMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        stories = [];
        avatars = [];
    }
}

function updateScrollList(storiesToDisplay) {
    scrollList.innerHTML = storiesToDisplay.length 
        ? storiesToDisplay.map((story, index) => createScrollElement(story, index)).join('')
        : '<p>The ink well runs dry... Asher has yet to inscribe new tales.</p>';
}

function createScrollElement(story, index) {
    const { title, avatars, magical_ranking, story: storyText } = story;
    return `
        <div class="scroll-item" data-story-index="${index}">
            <h3 class="scroll-title">${title}</h3>
            <div class="scroll-meta">
                <div class="scroll-authors">${getAvatarsHTML(avatars)}</div>
                <div class="scroll-rating">${getRatingEmoji(magical_ranking)} ${magical_ranking}</div>
            </div>
            <p class="scroll-glimpse">${storyText.substring(0, 150)}...</p>
        </div>
    `;
}

function getAvatarsHTML(avatarNames) {
    return avatarNames.map(name => {
        const avatar = avatars.find(a => a.name === name);
        return avatar ? `<img src="${avatar.avatar}" alt="${name}" title="${name}" class="avatar-icon">` : name;
    }).join(' ');
}

function getRatingEmoji(ranking) {
    if (ranking >= 90) return '🌟';
    if (ranking >= 70) return '✨';
    if (ranking >= 50) return '📖';
    if (ranking >= 30) return '📜';
    return '📝';
}

function handleScrollItemClick(event) {
    const scrollItem = event.target.closest('.scroll-item');
    if (scrollItem) {
        const index = parseInt(scrollItem.dataset.storyIndex, 10);
        showFullStory(index);
    }
}

function showFullStory(index) {
    const story = stories[index];
    storyContent.innerHTML = marked.parse(`
# ${story.title}

${story.story}

---

**Magical Ranking:** ${story.magical_ranking} ${getRatingEmoji(story.magical_ranking)}

*Chronicled by: ${story.avatars.join(', ')}*
    `);
    readingPane.style.display = 'block';
    noDataMessage.style.display = 'none';
    toggleViewButton.textContent = 'View Scribe\'s Notes';
    toggleViewButton.dataset.storyIndex = index;
    toggleViewButton.dataset.view = 'chronicle';
}

function toggleView() {
    const index = parseInt(toggleViewButton.dataset.storyIndex, 10);
    const currentStory = stories[index];
    const isViewingStory = toggleViewButton.dataset.view === 'chronicle';
    
    storyContent.innerHTML = marked.parse(isViewingStory ? `
# Edit Suggestions for "${currentStory.title}"

${currentStory.edit}

**Magical Ranking:** ${currentStory.magical_ranking} ${getRatingEmoji(currentStory.magical_ranking)}
    ` : `
# ${currentStory.title}

${currentStory.story}

---

**Magical Ranking:** ${currentStory.magical_ranking} ${getRatingEmoji(currentStory.magical_ranking)}

*Chronicled by: ${currentStory.avatars.join(', ')}*
    `);
    toggleViewButton.textContent = isViewingStory ? 'View Chronicle' : 'View Scribe\'s Notes';
    toggleViewButton.dataset.view = isViewingStory ? 'edit' : 'chronicle';
}

function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredStories = stories.filter(story => 
        story.title.toLowerCase().includes(searchTerm) || 
        story.story.toLowerCase().includes(searchTerm)
    );
    updateScrollList(filteredStories);
}
